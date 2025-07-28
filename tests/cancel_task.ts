import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";

describe("nodara - cancel_task", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const generateTaskPDA = (creator: PublicKey, taskId: anchor.BN) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        creator.toBuffer(),
        Buffer.from(taskId.toArray("le", 8)),
      ],
      program.programId
    );

  const generateVaultPDA = (taskPDA: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), taskPDA.toBuffer()],
      program.programId
    );

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

  it("Succeeds on first deposit", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask();
    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);

    await program.methods
      .depositFunds(taskId, depositAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();

    const rent = await provider.connection.getMinimumBalanceForRentExemption(
      program.account.rewardVaultAccount.size
    );

    const vaultBalance = await provider.connection.getBalance(vaultPDA);
    const account = await program.account.rewardVaultAccount.fetch(vaultPDA);

    assert.equal(vaultBalance, depositAmount.toNumber() + rent);
    assert.equal(account.balance.toNumber(), depositAmount.toNumber());
  });

  it("Allows multiple deposits (adds up)", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask();
    const firstAmount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
    const secondAmount = new anchor.BN(0.03 * LAMPORTS_PER_SOL);

    await program.methods
      .depositFunds(taskId, firstAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();

    await program.methods
      .depositFunds(taskId, secondAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();

    const account = await program.account.rewardVaultAccount.fetch(vaultPDA);
    const total = firstAmount.add(secondAmount).toNumber();

    assert.equal(account.balance.toNumber(), total);
  });

  it("Fails on zero lamport deposit", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask();
    const zeroAmount = new anchor.BN(0);

    try {
      await program.methods
        .depositFunds(taskId, zeroAmount)
        .accountsPartial({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
        })
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidDepositAmount");
    }
  });

  it("Fails when vault PDA is wrong", async () => {
    const { taskId, taskPDA } = await createTask();
    const wrongVault = Keypair.generate().publicKey;
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .depositFunds(taskId, amount)
        .accountsPartial({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: wrongVault,
        })
        .rpc();
      assert.fail("Should have failed due to PDA mismatch");
    } catch (err: any) {
      expect(err.message).to.include("A seeds constraint was violated");
    }
  });

  it("Fails if not the task creator", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask();

    const fakeUser = Keypair.generate();
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    // Fund the fake user
    const sig = await provider.connection.requestAirdrop(
      fakeUser.publicKey,
      0.1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .depositFunds(taskId, amount)
        .accountsPartial({
          creator: fakeUser.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
        })
        .signers([fakeUser])
        .rpc();

      assert.fail("Should not succeed with wrong creator");
    } catch (err: any) {
      expect(err.message).to.include("A seeds constraint was violated");
    }
  });
});
