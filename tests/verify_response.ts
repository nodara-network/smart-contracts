import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import {
  generateAdminPDA,
  generateTaskPDA,
  generateVaultPDA,
} from "./test-utils";

describe("nodara - verify_response", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;
  const adminAuthority = wallet.publicKey;

  const [adminAccountPDA] = generateAdminPDA(program);

  const createTaskWithDeposit = async () => {
    const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
    const rewardPerResponse = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    const maxResponses = 1;
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 600);
    const cid = "QmTaskCID" + taskId.toString();
    const creator = wallet.publicKey;

    const [taskPDA] = generateTaskPDA(creator, taskId, program);
    const [vaultPDA] = generateVaultPDA(taskPDA, program);

    await program.methods
      .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
      .accounts({ creator })
      .rpc();

    const totalDeposit = rewardPerResponse.mul(new anchor.BN(maxResponses));
    await program.methods
      .depositFunds(taskId, totalDeposit)
      .accountsPartial({
        creator,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      })
      .rpc();

    return { taskId, taskPDA };
  };

  const submitResponse = async (taskPDA: PublicKey, responder: Keypair, cid: string) => {
    const [responsePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("response"), taskPDA.toBuffer(), responder.publicKey.toBuffer()],
      program.programId
    );

    const sig = await provider.connection.requestAirdrop(responder.publicKey, 0.1 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .submitResponse(cid)
      .accountsPartial({
        taskAccount: taskPDA,
        responseAccount: responsePDA,
        responder: responder.publicKey,
        admin: adminAuthority,
        adminAccount: adminAccountPDA,
      })
      .rpc();

    return responsePDA;
  };

  it("Verifies a response successfully", async () => {
    const { taskPDA } = await createTaskWithDeposit();
    const responder = Keypair.generate();
    const responsePDA = await submitResponse(taskPDA, responder, "QmResVerify");

    await program.methods
      .verifyResponse()
      .accountsPartial({
        responseAccount: responsePDA,
        adminAccount: adminAccountPDA,
        signer: adminAuthority,
      })
      .rpc();

    const response = await program.account.responseAccount.fetch(responsePDA);
    assert.isTrue(response.isVerified, "Response should be marked as verified");
  });

  it("Fails if non-admin tries to verify", async () => {
    const { taskPDA } = await createTaskWithDeposit();
    const responder = Keypair.generate();
    const intruder = Keypair.generate();
    const responsePDA = await submitResponse(taskPDA, responder, "QmBadGuy");

    const sig = await provider.connection.requestAirdrop(intruder.publicKey, 0.1 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .verifyResponse()
        .accountsPartial({
          responseAccount: responsePDA,
          adminAccount: adminAccountPDA,
          signer: intruder.publicKey,
        })
        .signers([intruder])
        .rpc();

      assert.fail("Expected failure: only admin should verify");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("Allows verifying a response only once", async () => {
    const { taskPDA } = await createTaskWithDeposit();
    const responder = Keypair.generate();
    const responsePDA = await submitResponse(taskPDA, responder, "QmOnce");

    await program.methods
      .verifyResponse()
      .accountsPartial({
        responseAccount: responsePDA,
        adminAccount: adminAccountPDA,
        signer: adminAuthority,
      })
      .rpc();

    const response = await program.account.responseAccount.fetch(responsePDA);
    assert.isTrue(response.isVerified, "Response should be verified");

    // Try verifying again (should succeed, idempotent)
    await program.methods
      .verifyResponse()
      .accountsPartial({
        responseAccount: responsePDA,
        adminAccount: adminAccountPDA,
        signer: adminAuthority,
      })
      .rpc();

    const reFetched = await program.account.responseAccount.fetch(responsePDA);
    assert.isTrue(reFetched.isVerified, "Response should still be verified");
  });
});
