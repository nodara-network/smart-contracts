import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import { validTaskInput } from "./test-utils";

describe("nodara - create_task", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  it("Creates a task successfully", async () => {
    const { taskId, rewardPerResponse, maxResponses, deadline, cid, taskPDA } =
      await validTaskInput(wallet.publicKey, program);

    await program.methods
      .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
      .accounts({
        creator: wallet.publicKey,
      })
      .rpc();

    const task = await program.account.taskAccount.fetch(taskPDA);

    assert.strictEqual(task.taskId.toNumber(), taskId.toNumber());
    assert.strictEqual(task.creator.toBase58(), wallet.publicKey.toBase58());
    assert.strictEqual(
      task.rewardPerResponse.toNumber(),
      rewardPerResponse.toNumber()
    );
    assert.strictEqual(task.maxResponses, maxResponses);
    assert.strictEqual(task.responsesReceived, 0);
    assert.strictEqual(task.isComplete, false);
    assert.strictEqual(task.deadline.toNumber(), deadline.toNumber());
    assert.strictEqual(task.cid, cid);
  });

  it("Fails with task_id = 0", async () => {
    const { rewardPerResponse, maxResponses, deadline, cid } =
      await validTaskInput(wallet.publicKey, program);

    const taskId = new anchor.BN(0);

    try {
      await program.methods
        .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();

      expect.fail("Expected createTask to throw an error but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidTaskId/);
    }
  });

  it("Fails with reward_per_response = 0", async () => {
    const { taskId, maxResponses, deadline, cid } = await validTaskInput(wallet.publicKey, program);


    try {
      await program.methods
        .createTask(taskId, new anchor.BN(0), maxResponses, deadline, cid)
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();
      expect.fail("Expected to throw InvalidReward but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidReward/);
    }
  });

  it("Fails with max_responses = 0", async () => {
    const { taskId, rewardPerResponse, deadline, cid } = await validTaskInput(wallet.publicKey, program);


    try {
      await program.methods
        .createTask(taskId, rewardPerResponse, 0, deadline, cid)
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();
      expect.fail("Expected to throw InvalidMaxResponses but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidMaxResponses/);
    }
  });

  it("Fails with deadline in the past", async () => {
    const { taskId, rewardPerResponse, maxResponses, cid } =
      await validTaskInput(wallet.publicKey, program);

    const pastDeadline = new anchor.BN(Math.floor(Date.now() / 1000 - 60));

    try {
      await program.methods
        .createTask(taskId, rewardPerResponse, maxResponses, pastDeadline, cid)
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();
      expect.fail("Expected to throw InvalidDeadline but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidDeadline/);
    }
  });

  it("Fails with empty CID", async () => {
    const { taskId, rewardPerResponse, maxResponses, deadline } =
      await validTaskInput(wallet.publicKey, program);

    try {
      await program.methods
        .createTask(taskId, rewardPerResponse, maxResponses, deadline, "")
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();
      expect.fail("Expected to throw InvalidCID but it succeeded.");
    } catch (err) {
      expect(err.message).to.match(/InvalidCID/);
    }
  });

  it("Fails when task account already exists", async () => {
    const input = await validTaskInput(wallet.publicKey, program);

    // First creation should succeed
    await program.methods
      .createTask(
        input.taskId,
        input.rewardPerResponse,
        input.maxResponses,
        input.deadline,
        input.cid
      )
      .accounts({
        creator: wallet.publicKey,
      })
      .rpc();

    // Re-creating same task → should fail
    try {
      await program.methods
        .createTask(
          input.taskId,
          input.rewardPerResponse,
          input.maxResponses,
          input.deadline,
          input.cid
        )
        .accounts({
          creator: wallet.publicKey,
        })
        .rpc();
      expect.fail(
        "Expected failure due to duplicate task account, but it succeeded."
      );
    } catch (err) {
      expect(err.message).to.match(/already.*in use/i);
    }
  });
});
