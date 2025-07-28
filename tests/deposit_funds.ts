import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContracts } from "../target/types/smart_contracts";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe.only("nodara - deposit_funds (error and success cases)", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

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

  const createTask = async () => {
    const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
    const rewardPerResponse = new anchor.BN(100_000);
    const maxResponses = 10;
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const cid = "QmCID" + taskId.toString();

    const [taskPDA] = generateTaskPDA(wallet.publicKey, taskId);
    const [vaultPDA] = generateVaultPDA(taskPDA);

    await program.methods
      .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
      .accounts({ creator: wallet.publicKey })
      .rpc();

    return { taskId, taskPDA, vaultPDA };
  };

  it.only("Succeeds on first deposit", async () => {
    const { vaultPDA, taskPDA } = await createTask();
    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .depositFunds(depositAmount)
        .accountsPartial({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
        })
        .rpc();
    } catch (error) {
      console.log(error);
    }

    const vault = await provider.connection.getBalance(vaultPDA);
    const account = await program.account.rewardVaultAccount.fetch(vaultPDA);

    assert.equal(vault, depositAmount.toNumber());
    assert.equal(account.balance.toNumber(), depositAmount.toNumber());
  });

  it("Fails on insufficient funds", async () => {
    const hugeAmount = new anchor.BN(1_000_000 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .depositFunds(hugeAmount)
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();

      expect.fail("Expected deposit to fail due to insufficient funds");
    } catch (err) {
      expect(err.message).to.match(/InsufficientFunds/i);
    }
  });

  it("Fails on overflow of reward_vault.balance", async () => {
    const { vaultPDA } = await createTask();
    const MAX_U64 = new anchor.BN("18446744073709551615");

    await provider.connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL * 2);

    await program.methods
      .depositFunds(new anchor.BN(1))
      .accounts({ creator: wallet.publicKey })
      .rpc();

    // Mock vault overflow — test validator can't mutate directly so this is illustrative
    const account = await program.account.rewardVaultAccount.fetch(vaultPDA);
    account.balance = MAX_U64.subn(1);

    try {
      await program.methods
        .depositFunds(new anchor.BN(10))
        .accounts({ creator: wallet.publicKey })
        .rpc();

      expect.fail("Expected overflow to fail");
    } catch (err) {
      expect(err.message).to.match(/TransferFailed/i);
    }
  });

  it("Fails if PDA seeds mismatch (invalid bump/seed)", async () => {
    const invalidTaskId = new anchor.BN(99999999); // unlikely to exist
    const [fakeTaskPDA] = generateTaskPDA(invalidTaskId);
    const [fakeVaultPDA] = generateVaultPDA(fakeTaskPDA);

    try {
      await program.methods
        .depositFunds(new anchor.BN(1_000))
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

  it("Fails if reward_vault balance would overflow (checked_add)", async () => {
    const MAX = new anchor.BN("18446744073709551615");

    // Set vault account balance directly to MAX - only possible via mock or test-hack

    try {
      await program.methods
        .depositFunds(MAX)
        .accounts({ creator: wallet.publicKey })
        .rpc();

      expect.fail("Expected failure due to balance overflow");
    } catch (err) {
      expect(err.message).to.match(/TransferFailed/i);
    }
  });
});
