import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import {
  createTask,
  depositFunds,
  generateAdminPDA,
  submitResponse
} from "./test-utils";

describe("nodara - mark_task_complete", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;
  const creator = wallet.publicKey;

  const [adminAccountPDA] = generateAdminPDA(program);

  it("Marks task as complete after responses received", async () => {
    const { taskId, taskPDA, vaultPDA, rewardPerResponse, maxResponses } = await createTask(wallet.publicKey, program, 3);
    const totalReward = rewardPerResponse.mul(new anchor.BN(maxResponses));
    await depositFunds(taskId, taskPDA, vaultPDA, totalReward, program);

    // Submit responses from N responders
    const responders: Keypair[] = [];
    for (let i = 0; i < maxResponses; i++) {
      const responder = Keypair.generate();
      responders.push(responder);
      await submitResponse(taskPDA, responder, `QmRes${i}`, program, provider);
    }

    const task = await program.account.taskAccount.fetch(taskPDA);
    assert.isTrue(task.isComplete, "Task should be marked as complete");
  });

  it("Fails if already marked complete", async () => {
    const { taskId, taskPDA, vaultPDA, rewardPerResponse, maxResponses } = await createTask(wallet.publicKey, program);
    const totalReward = rewardPerResponse.mul(new anchor.BN(maxResponses));
    await depositFunds(taskId, taskPDA, vaultPDA, totalReward, program);

    const responder1 = Keypair.generate();
    const responder2 = Keypair.generate();
    await submitResponse(taskPDA, responder1, "QmOne", program, provider);
    await submitResponse(taskPDA, responder2, "QmTwo", program, provider);

    await program.methods
      .refundRemaining()
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
      })
      .rpc();
    await program.methods
      .markTaskComplete()
      .accountsPartial({
        taskAccount: taskPDA,
        adminAccount: adminAccountPDA,
        signer: creator,
      })
      .rpc();

    try {
      await program.methods
        .markTaskComplete()
        .accountsPartial({
          taskAccount: taskPDA,
          adminAccount: adminAccountPDA,
          signer: creator,
        })
        .rpc();
      assert.fail("Expected failure: task already complete");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("TaskAlreadyComplete");
    }
  });

  it("fails if non-admin or non-creator tries to complete", async () => {
    const { taskId, taskPDA, vaultPDA, rewardPerResponse, maxResponses } = await createTask(wallet.publicKey, program);
    const totalReward = rewardPerResponse.mul(new anchor.BN(maxResponses));
    await depositFunds(taskId, taskPDA, vaultPDA, totalReward, program);

    const responder1 = Keypair.generate();
    const responder2 = Keypair.generate();
    await submitResponse(taskPDA, responder1, "QmA", program, provider);
    await submitResponse(taskPDA, responder2, "QmB", program, provider);

    const intruder = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(intruder.publicKey, LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .markTaskComplete()
        .accountsPartial({
          taskAccount: taskPDA,
          adminAccount: adminAccountPDA,
          signer: intruder.publicKey,
        })
        .signers([intruder])
        .rpc();

      assert.fail("Expected failure: intruder should not be allowed");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });
});
