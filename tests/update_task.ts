import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import { validTaskInput, createTask } from "./test-utils";

describe("nodara - update_task", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  it("Updates a task successfully", async () => {
    // First, create the task
    const { taskId, taskPDA } = await createTask(wallet.publicKey, program);

    // New parameters
    const newRewardPerResponse = new anchor.BN(200_000);
    const newMaxResponses = 20;
    const newDeadline = new anchor.BN(Math.floor(Date.now() / 1000) + 7200);
    const newCid = "QmUpdatedCIDHash";

    await program.methods
      .updateTask(taskId, newRewardPerResponse, newMaxResponses, newDeadline, newCid)
      .accounts({
        creator: wallet.publicKey,
      })
      .rpc();

    const updatedTask = await program.account.taskAccount.fetch(taskPDA);
    assert.strictEqual(updatedTask.rewardPerResponse.toNumber(), newRewardPerResponse.toNumber());
    assert.strictEqual(updatedTask.maxResponses, newMaxResponses);
    assert.strictEqual(updatedTask.deadline.toNumber(), newDeadline.toNumber());
    assert.strictEqual(updatedTask.cid, newCid);
  });

  it("Fails with task_id = 0", async () => {
    const { rewardPerResponse, maxResponses, deadline, cid } =
      await validTaskInput(wallet.publicKey, program);
    const taskId = new anchor.BN(0);

    try {
      await program.methods
        .updateTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
        .accounts({ creator: wallet.publicKey })
        .rpc();
      expect.fail("Expected updateTask to throw InvalidTaskId but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/AccountNotInitialized./);
    }
  });

  it("Fails with reward_per_response = 0", async () => {
    const { taskId } = await createTask(wallet.publicKey, program);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    try {
      await program.methods
        .updateTask(taskId, new anchor.BN(0), 5, deadline, "QmCID")
        .accounts({ creator: wallet.publicKey })
        .rpc();
      expect.fail("Expected InvalidReward but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidReward/);
    }
  });

  it("Fails with max_responses = 0", async () => {
    const { taskId, rewardPerResponse } = await createTask(wallet.publicKey, program);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    try {
      await program.methods
        .updateTask(taskId, rewardPerResponse, 0, deadline, "QmCID")
        .accounts({ creator: wallet.publicKey })
        .rpc();
      expect.fail("Expected InvalidMaxResponses but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidMaxResponses/);
    }
  });

  it("Fails with deadline in the past", async () => {
    const { taskId, rewardPerResponse } = await createTask(wallet.publicKey, program);
    const pastDeadline = new anchor.BN(Math.floor(Date.now() / 1000) - 60);

    try {
      await program.methods
        .updateTask(taskId, rewardPerResponse, 5, pastDeadline, "QmCID")
        .accounts({ creator: wallet.publicKey })
        .rpc();
      expect.fail("Expected InvalidDeadline but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidDeadline/);
    }
  });

  it("Fails with empty CID", async () => {
    const { taskId, rewardPerResponse } = await createTask(wallet.publicKey, program);
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    try {
      await program.methods
        .updateTask(taskId, rewardPerResponse, 5, deadline, "")
        .accounts({ creator: wallet.publicKey })
        .rpc();
      expect.fail("Expected InvalidCID but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidCID/);
    }
  });

  it("Fails when task does not exist", async () => {
    const { taskId, rewardPerResponse, maxResponses, deadline, cid } =
      await validTaskInput(wallet.publicKey, program);

    try {
      await program.methods
        .updateTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
        .accounts({ creator: wallet.publicKey })
        .rpc();
      expect.fail("Expected failure due to missing task account but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/AccountNotInitialized./i);
    }
  });
});
