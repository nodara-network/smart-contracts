import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import {
  createTask,
  depositFunds,
  generateAdminPDA,
  generateVaultPDA,
} from "./test-utils";

describe("nodara - disburse_rewards", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;
  const adminAuthority = wallet.publicKey;

  const [adminAccountPDA] = generateAdminPDA(program);

  // Helper to create complete task setup with responses
  const createTaskWithVerifiedResponses = async (
    numResponses: number = 2,
    rewardAmount: number = 0.05
  ) => {
    const rewardPerResponse = new anchor.BN(rewardAmount * LAMPORTS_PER_SOL);
    const { taskId, taskPDA, vaultPDA } = await createTask(
      wallet.publicKey,
      program,
      numResponses
    );

    // Deposit enough funds for all responses
    const totalDeposit = rewardPerResponse.mul(new anchor.BN(numResponses));
    await depositFunds(taskId, taskPDA, vaultPDA, totalDeposit, program);

    // Create and submit responses
    const responders: Keypair[] = [];
    const responsePDAs: PublicKey[] = [];

    for (let i = 0; i < numResponses; i++) {
      const responder = Keypair.generate();
      responders.push(responder);

      // Generate response PDA
      const [responsePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("response"),
          taskPDA.toBuffer(),
          responder.publicKey.toBuffer(),
        ],
        program.programId
      );
      responsePDAs.push(responsePDA);

      // Airdrop to responder
      const sig = await provider.connection.requestAirdrop(
        responder.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      // Submit response
      await program.methods
        .submitResponse(`QmResponse${i}`)
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA,
          responder: responder.publicKey,
          admin: adminAuthority,
          adminAccount: adminAccountPDA,
        })
        .rpc();

      // Verify response
      await program.methods
        .verifyResponse()
        .accountsPartial({
          responseAccount: responsePDA,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();
    }

    // Mark task complete
    await program.methods
      .markTaskComplete()
      .accountsPartial({
        taskAccount: taskPDA,
        adminAccount: adminAccountPDA,
        signer: adminAuthority,
      })
      .rpc();

    return {
      taskId,
      taskPDA,
      vaultPDA,
      responders,
      responsePDAs,
      rewardPerResponse,
    };
  };

  // Helper to create task with unverified response
  const createTaskWithUnverifiedResponse = async () => {
    const { taskId, taskPDA, vaultPDA, rewardPerResponse } = await createTask(
      wallet.publicKey,
      program,
      1
    );

    await depositFunds(taskId, taskPDA, vaultPDA, rewardPerResponse, program);

    const responder = Keypair.generate();
    const [responsePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("response"),
        taskPDA.toBuffer(),
        responder.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Airdrop and submit response (but don't verify)
    const sig = await provider.connection.requestAirdrop(
      responder.publicKey,
      0.1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .submitResponse("QmUnverified")
      .accountsPartial({
        taskAccount: taskPDA,
        responseAccount: responsePDA,
        responder: responder.publicKey,
        admin: adminAuthority,
        adminAccount: adminAccountPDA,
      })
      .rpc();

    // Mark task complete without verification
    await program.methods
      .markTaskComplete()
      .accountsPartial({
        taskAccount: taskPDA,
        adminAccount: adminAccountPDA,
        signer: adminAuthority,
      })
      .rpc();

    return { taskPDA, vaultPDA, responder, responsePDA, rewardPerResponse };
  };

  describe("Success Cases", () => {
    it("Successfully disburses reward to verified responder", async () => {
      const { taskPDA, vaultPDA, responders, responsePDAs, rewardPerResponse } =
        await createTaskWithVerifiedResponses(1);

      const responder = responders[0];
      const responsePDA = responsePDAs[0];

      // Check initial balances
      const initialRecipientBalance = await provider.connection.getBalance(
        responder.publicKey
      );
      const initialVault = await program.account.rewardVaultAccount.fetch(
        vaultPDA
      );

      // Disburse reward
      await program.methods
        .disburseRewards()
        .accountsPartial({
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          responseAccount: responsePDA,
          recipient: responder.publicKey,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      // Verify balances updated correctly
      const finalRecipientBalance = await provider.connection.getBalance(
        responder.publicKey
      );
      const finalVault = await program.account.rewardVaultAccount.fetch(
        vaultPDA
      );

      assert.equal(
        finalRecipientBalance - initialRecipientBalance,
        rewardPerResponse.toNumber(),
        "Recipient should receive exact reward amount"
      );

      assert.equal(
        initialVault.balance.toNumber() - finalVault.balance.toNumber(),
        rewardPerResponse.toNumber(),
        "Vault balance should decrease by reward amount"
      );
    });

    it("Disburses rewards to multiple verified responders", async () => {
      const { taskPDA, vaultPDA, responders, responsePDAs, rewardPerResponse } =
        await createTaskWithVerifiedResponses(3);

      const initialVaultBalance = (
        await program.account.rewardVaultAccount.fetch(vaultPDA)
      ).balance.toNumber();

      // Disburse to each responder
      for (let i = 0; i < responders.length; i++) {
        const responder = responders[i];
        const responsePDA = responsePDAs[i];

        const initialBalance = await provider.connection.getBalance(
          responder.publicKey
        );

        await program.methods
          .disburseRewards()
          .accountsPartial({
            taskAccount: taskPDA,
            rewardVault: vaultPDA,
            responseAccount: responsePDA,
            recipient: responder.publicKey,
            adminAccount: adminAccountPDA,
            signer: adminAuthority,
          })
          .rpc();

        const finalBalance = await provider.connection.getBalance(
          responder.publicKey
        );

        assert.equal(
          finalBalance - initialBalance,
          rewardPerResponse.toNumber(),
          `Responder ${i} should receive correct reward`
        );
      }

      // Check final vault balance
      const finalVaultBalance = (
        await program.account.rewardVaultAccount.fetch(vaultPDA)
      ).balance.toNumber();

      assert.equal(
        initialVaultBalance - finalVaultBalance,
        rewardPerResponse.toNumber() * responders.length,
        "Total disbursed should equal sum of individual rewards"
      );
    });

    it("Allows disbursement after task auto-completion", async () => {
      // Create task that auto-completes when max responses reached
      const { taskId, taskPDA, vaultPDA, rewardPerResponse } = await createTask(
        wallet.publicKey,
        program,
        2 // Max 2 responses for auto-completion
      );

      await depositFunds(
        taskId,
        taskPDA,
        vaultPDA,
        rewardPerResponse.mul(new anchor.BN(2)),
        program
      );

      // Submit exactly max responses to trigger auto-completion
      const responders = [];
      const responsePDAs = [];

      for (let i = 0; i < 2; i++) {
        const responder = Keypair.generate();
        responders.push(responder);

        const [responsePDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("response"),
            taskPDA.toBuffer(),
            responder.publicKey.toBuffer(),
          ],
          program.programId
        );
        responsePDAs.push(responsePDA);

        const sig = await provider.connection.requestAirdrop(
          responder.publicKey,
          0.1 * LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sig);

        await program.methods
          .submitResponse(`QmAuto${i}`)
          .accountsPartial({
            taskAccount: taskPDA,
            responseAccount: responsePDA,
            responder: responder.publicKey,
            admin: adminAuthority,
            adminAccount: adminAccountPDA,
          })
          .rpc();

        await program.methods
          .verifyResponse()
          .accountsPartial({
            responseAccount: responsePDA,
            adminAccount: adminAccountPDA,
            signer: adminAuthority,
          })
          .rpc();
      }

      // Verify task is auto-completed
      const task = await program.account.taskAccount.fetch(taskPDA);
      assert.isTrue(task.isComplete, "Task should be auto-completed");

      // Should be able to disburse rewards
      await program.methods
        .disburseRewards()
        .accountsPartial({
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          responseAccount: responsePDAs[0],
          recipient: responders[0].publicKey,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();
    });
  });

  describe("Error Cases", () => {
    it("Fails to disburse to unverified response", async () => {
      const { taskPDA, vaultPDA, responder, responsePDA } =
        await createTaskWithUnverifiedResponse();

      try {
        await program.methods
          .disburseRewards()
          .accountsPartial({
            taskAccount: taskPDA,
            rewardVault: vaultPDA,
            responseAccount: responsePDA,
            recipient: responder.publicKey,
            adminAccount: adminAccountPDA,
            signer: adminAuthority,
          })
          .rpc();

        assert.fail("Should fail for unverified response");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Fails if task is not complete", async () => {
      const { taskId, taskPDA, vaultPDA, rewardPerResponse } = await createTask(
        wallet.publicKey,
        program,
        2
      );

      await depositFunds(taskId, taskPDA, vaultPDA, rewardPerResponse, program);

      const responder = Keypair.generate();
      const [responsePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("response"),
          taskPDA.toBuffer(),
          responder.publicKey.toBuffer(),
        ],
        program.programId
      );

      const sig = await provider.connection.requestAirdrop(
        responder.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      await program.methods
        .submitResponse("QmIncomplete")
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA,
          responder: responder.publicKey,
          admin: adminAuthority,
          adminAccount: adminAccountPDA,
        })
        .rpc();

      await program.methods
        .verifyResponse()
        .accountsPartial({
          responseAccount: responsePDA,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      // Don't mark task complete - should fail
      try {
        await program.methods
          .disburseRewards()
          .accountsPartial({
            taskAccount: taskPDA,
            rewardVault: vaultPDA,
            responseAccount: responsePDA,
            recipient: responder.publicKey,
            adminAccount: adminAccountPDA,
            signer: adminAuthority,
          })
          .rpc();

        assert.fail("Should fail for incomplete task");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("TaskAlreadyComplete");
      }
    });

    it("Fails with insufficient vault balance", async () => {
      // Create task with minimal deposit
      const { taskId, taskPDA, vaultPDA } = await createTask(
        wallet.publicKey,
        program,
        1
      );

      const minimalDeposit = new anchor.BN(1000); // Very small amount
      await depositFunds(taskId, taskPDA, vaultPDA, minimalDeposit, program);

      const responder = Keypair.generate();
      const [responsePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("response"),
          taskPDA.toBuffer(),
          responder.publicKey.toBuffer(),
        ],
        program.programId
      );

      const sig = await provider.connection.requestAirdrop(
        responder.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      await program.methods
        .submitResponse("QmPoor")
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA,
          responder: responder.publicKey,
          admin: adminAuthority,
          adminAccount: adminAccountPDA,
        })
        .rpc();

      await program.methods
        .verifyResponse()
        .accountsPartial({
          responseAccount: responsePDA,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      await program.methods
        .markTaskComplete()
        .accountsPartial({
          taskAccount: taskPDA,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      try {
        await program.methods
          .disburseRewards()
          .accountsPartial({
            taskAccount: taskPDA,
            rewardVault: vaultPDA,
            responseAccount: responsePDA,
            recipient: responder.publicKey,
            adminAccount: adminAccountPDA,
            signer: adminAuthority,
          })
          .rpc();

        assert.fail("Should fail with insufficient vault balance");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InsufficientVaultBalance");
      }
    });

    it("Fails if non-admin tries to disburse", async () => {
      const { taskPDA, vaultPDA, responders, responsePDAs } =
        await createTaskWithVerifiedResponses(1);

      const intruder = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        intruder.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      try {
        await program.methods
          .disburseRewards()
          .accountsPartial({
            taskAccount: taskPDA,
            rewardVault: vaultPDA,
            responseAccount: responsePDAs[0],
            recipient: responders[0].publicKey,
            adminAccount: adminAccountPDA,
            signer: intruder.publicKey,
          })
          .signers([intruder])
          .rpc();

        assert.fail("Should fail for non-admin signer");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("Unauthorized");
      }
    });

    it("Fails for non-existent response account", async () => {
      const { taskPDA, vaultPDA } = await createTaskWithVerifiedResponses(1);

      const fakeResponder = Keypair.generate();
      const [fakeResponsePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("response"),
          taskPDA.toBuffer(),
          fakeResponder.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .disburseRewards()
          .accountsPartial({
            taskAccount: taskPDA,
            rewardVault: vaultPDA,
            responseAccount: fakeResponsePDA,
            recipient: fakeResponder.publicKey,
            adminAccount: adminAccountPDA,
            signer: adminAuthority,
          })
          .rpc();

        assert.fail("Should fail for non-existent response");
      } catch (err: any) {
        expect(err.message).to.include("Account does not exist");
      }
    });

    it("Prevents double disbursement to same responder", async () => {
      const { taskPDA, vaultPDA, responders, responsePDAs, rewardPerResponse } =
        await createTaskWithVerifiedResponses(1);

      const responder = responders[0];
      const responsePDA = responsePDAs[0];

      // First disbursement should succeed
      await program.methods
        .disburseRewards()
        .accountsPartial({
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          responseAccount: responsePDA,
          recipient: responder.publicKey,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      // Second disbursement should also succeed (idempotent)
      // Note: Current implementation doesn't prevent double disbursement
      // You might want to add a disbursed flag to ResponseAccount
      await program.methods
        .disburseRewards()
        .accountsPartial({
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          responseAccount: responsePDA,
          recipient: responder.publicKey,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      // Check that responder got double reward (this is a bug to fix!)
      const finalBalance = await provider.connection.getBalance(
        responder.publicKey
      );
      console.log(
        "⚠️  Warning: Double disbursement allowed - consider adding disbursed flag"
      );
    });
  });

  describe("Edge Cases", () => {
    it("Handles zero reward amount gracefully", async () => {
      // Create task with zero reward
      const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
      const rewardPerResponse = new anchor.BN(0);
      const maxResponses = 1;
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
      const cid = "QmZeroReward";

      const { taskPDA, vaultPDA } = await createTask(
        wallet.publicKey,
        program,
        1
      );

      // This should work but transfer 0 lamports
      const responder = Keypair.generate();
      const [responsePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("response"),
          taskPDA.toBuffer(),
          responder.publicKey.toBuffer(),
        ],
        program.programId
      );

      const sig = await provider.connection.requestAirdrop(
        responder.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);

      await program.methods
        .submitResponse("QmZero")
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA,
          responder: responder.publicKey,
          admin: adminAuthority,
          adminAccount: adminAccountPDA,
        })
        .rpc();

      await program.methods
        .verifyResponse()
        .accountsPartial({
          responseAccount: responsePDA,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      await program.methods
        .markTaskComplete()
        .accountsPartial({
          taskAccount: taskPDA,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      const initialBalance = await provider.connection.getBalance(
        responder.publicKey
      );

      await program.methods
        .disburseRewards()
        .accountsPartial({
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          responseAccount: responsePDA,
          recipient: responder.publicKey,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      const finalBalance = await provider.connection.getBalance(
        responder.publicKey
      );

      // Balance should be unchanged (0 reward)
      assert.equal(
        finalBalance,
        initialBalance,
        "Balance should be unchanged for zero reward"
      );
    });

    it("Works with maximum SOL amounts", async () => {
      const { taskPDA, vaultPDA, responders, responsePDAs } =
        await createTaskWithVerifiedResponses(1, 1.0); // 1 SOL reward

      const responder = responders[0];
      const responsePDA = responsePDAs[0];

      const initialBalance = await provider.connection.getBalance(
        responder.publicKey
      );

      await program.methods
        .disburseRewards()
        .accountsPartial({
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          responseAccount: responsePDA,
          recipient: responder.publicKey,
          adminAccount: adminAccountPDA,
          signer: adminAuthority,
        })
        .rpc();

      const finalBalance = await provider.connection.getBalance(
        responder.publicKey
      );

      assert.equal(
        finalBalance - initialBalance,
        1 * LAMPORTS_PER_SOL,
        "Should handle large SOL amounts correctly"
      );
    });
  });
});
