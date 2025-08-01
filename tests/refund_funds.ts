import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import { createTask, generateAdminPDA } from "./test-utils";

describe("nodara - refund_funds", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const [adminAccountPDA] = generateAdminPDA(program);
  const adminAuthority = wallet.publicKey;

  it("Succeeds refund", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask(wallet.publicKey, program);
    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);

    await program.methods
      .depositFunds(taskId, depositAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
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
    assert.equal(account.isComplete, false);
  });

  it("Fails if caller is not the task creator", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);

    // Fund and deposit from real creator
    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    await program.methods
      .depositFunds(taskId, depositAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
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
      expect(err.message).to.include("AnchorError caused by account: task_account.");
    }
  });

  it("Fails if task is already complete", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program, 1);

    const depositAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    await program.methods
      .depositFunds(taskId, depositAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      })
      .rpc();

    // Submit Response
    const responder = Keypair.generate();
    const [responsePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("response"), taskPDA.toBuffer(), responder.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .submitResponse("QmTestCID")
      .accountsPartial({
        taskAccount: taskPDA,
        responseAccount: responsePDA,
        responder: responder.publicKey,
        admin: wallet.publicKey,
        adminAccount: adminAccountPDA,
      })
      .rpc();

    // Attempt refund
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
