import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContracts } from "../target/types/smart_contracts";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("nodara - deposit_funds (error and success cases)", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  // Helper function to generate task and vault PDAs
  const generateTaskPDA = (creator: PublicKey, taskId: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        creator.toBuffer(),
        Buffer.from(taskId.toArray("le", 8)),
      ],
      program.programId
    );
  };

  const generateVaultPDA = (taskPDA: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), taskPDA.toBuffer()],
      program.programId
    );
  };

  // Helper function to create a task (returns task data)
  const createTask = async () => {
    const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
    const rewardPerResponse = new anchor.BN(100_000);
    const maxResponses = 10;
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const cid = "QmCID" + taskId.toString();

    // Generate PDAs for task and vault
    const [taskPDA] = generateTaskPDA(wallet.publicKey, taskId);
    const [vaultPDA] = generateVaultPDA(taskPDA);

    // Create task on-chain
    await program.methods
      .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
      .accounts({ creator: wallet.publicKey })
      .rpc();

    return { taskId, taskPDA, vaultPDA };
  };

  // Test success case for deposit
  it("Succeeds on first deposit", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask();
    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);

    console.log("Task PDA:", taskPDA.toBase58());

    try {
      // Deposit funds to the task
      await program.methods
        .depositFunds(taskId, depositAmount)
        .accounts({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
        })
        .rpc();
    } catch (error) {
      console.log(error);
    }

    // Check vault balance and account balance after deposit
    const vaultBalance = await provider.connection.getBalance(vaultPDA);
    const account = await program.account.rewardVaultAccount.fetch(vaultPDA);

    assert.equal(vaultBalance, depositAmount.toNumber());
    assert.equal(account.balance.toNumber(), depositAmount.toNumber());
  });

  // Test failure due to insufficient funds
  it("Fails on insufficient funds", async () => {
    const { taskId } = await createTask();
    const hugeAmount = new anchor.BN(1_000_000 * LAMPORTS_PER_SOL);

    try {
      // Try depositing an amount larger than available funds
      await program.methods
        .depositFunds(taskId, hugeAmount)
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();

      expect.fail("Expected deposit to fail due to insufficient funds");
    } catch (err) {
      expect(err.message).to.match(/InsufficientFunds/i);
    }
  });

  // Test failure on vault balance overflow
  it("Fails on overflow of reward_vault.balance", async () => {
    const { vaultPDA, taskId } = await createTask();
    const MAX_U64 = new anchor.BN("18446744073709551615");

    await provider.connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL * 2);

    // Initial deposit
    await program.methods
      .depositFunds(taskId, new anchor.BN(1))
      .accounts({ creator: wallet.publicKey })
      .rpc();

    // Set vault account balance to near maximum
    const account = await program.account.rewardVaultAccount.fetch(vaultPDA);
    account.balance = MAX_U64.subn(1);

    try {
      // Try to overflow the vault balance
      await program.methods
        .depositFunds(taskId, new anchor.BN(10))
        .accounts({ creator: wallet.publicKey })
        .rpc();

      expect.fail("Expected overflow to fail");
    } catch (err) {
      expect(err.message).to.match(/TransferFailed/i);
    }
  });

  // Test failure if PDA seeds mismatch
  it("Fails if PDA seeds mismatch (invalid bump/seed)", async () => {
    const invalidTaskId = new anchor.BN(99999999); // unlikely to exist
    const [fakeTaskPDA] = generateTaskPDA(wallet.publicKey, invalidTaskId);
    const [fakeVaultPDA] = generateVaultPDA(fakeTaskPDA);

    try {
      // Try using a PDA that doesn't exist
      await program.methods
        .depositFunds(invalidTaskId, new anchor.BN(1_000))
        .accounts({
          creator: wallet.publicKey,
          taskAccount: fakeTaskPDA,
          rewardVault: fakeVaultPDA,
        })
        .rpc();

      expect.fail("Expected seed mismatch or constraint error");
    } catch (err) {
      expect(err.message).to.match(/has one constraint|seeds|bump/i);
    }
  });

  // Test failure if reward_vault balance would overflow (checked_add)
  it("Fails if reward_vault balance would overflow (checked_add)", async () => {
    const { taskId } = await createTask();
    const MAX = new anchor.BN("18446744073709551615");

    try {
      // Try depositing beyond the max vault balance
      await program.methods
        .depositFunds(taskId, MAX)
        .accounts({ creator: wallet.publicKey })
        .rpc();

      expect.fail("Expected failure due to balance overflow");
    } catch (err) {
      expect(err.message).to.match(/TransferFailed/i);
    }
  });
});
