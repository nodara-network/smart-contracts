import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";

describe("nodara - refund_funds", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const generateTaskPDA = (creator: PublicKey, taskId: anchor.BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("task"), creator.toBuffer(), Buffer.from(taskId.toArray("le", 8))],
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

  it("Succeeds refund", async () => {
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

    await program.methods
      .refundRemaining()
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();

    const account = await program.account.taskAccount.fetch(taskPDA);
    assert.equal(account.isComplete, true);
  });

  it("Fails if caller is not the task creator", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask();

    // Fund and deposit from real creator
    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    await program.methods
      .depositFunds(taskId, depositAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();

    // Generate a different user (not the creator)
    const otherUser = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(otherUser.publicKey, LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .refundRemaining()
        .accountsPartial({
          creator: otherUser.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
        })
        .signers([otherUser])
        .rpc();

      assert.fail("Expected refund to fail for non-creator");
    } catch (err: any) {
      expect(err.message).to.include("has one constraint was violated.");
    }
  });

  it("Fails if task is already complete", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask();

    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    await program.methods
      .depositFunds(taskId, depositAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();

    // Mark task complete
    await program.methods
      .markTaskComplete()
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA
      })
      .rpc();

    // Attempt refund
    // Remove the Require enough responses check to pass this error
    try {
      await program.methods
        .refundRemaining()
        .accountsPartial({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
        })
        .rpc();

      assert.fail("Expected refund to fail (task complete)");
    } catch (err: any) {
      expect(err.message).to.include("TaskAlreadyComplete");
    }
  });
});
