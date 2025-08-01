import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import { generateAdminPDA, generateTaskPDA, generateVaultPDA } from "./test-utils";

describe("nodara - submit_response", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const [adminAccountPDA] = generateAdminPDA(program);
  const adminAuthority = wallet.publicKey;

  const createTask = async (deadlineParam?: anchor.BN, maxResponses = 10) => {
    const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
    const rewardPerResponse = new anchor.BN(100_000);
    const deadline = deadlineParam ?? new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const cid = "QmCID" + taskId.toString();

    const [taskPDA] = generateTaskPDA(wallet.publicKey, taskId, program);
    const [vaultPDA] = generateVaultPDA(taskPDA, program);

    await program.methods
      .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
      .accounts({ creator: wallet.publicKey })
      .rpc();

    return { taskId, taskPDA, vaultPDA };
  };

  const depositFunds = async (deadlineParam?: anchor.BN, maxResponses = 10) => {
    const { taskId, taskPDA, vaultPDA } = await createTask(deadlineParam, maxResponses);
    const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    await program.methods.depositFunds(taskId, depositAmount).accountsPartial({
      creator: wallet.publicKey,
      taskAccount: taskPDA,
      rewardVault: vaultPDA,
      adminAccount: adminAccountPDA,
      adminAuthority,
    }).rpc();

    return { taskId, taskPDA, vaultPDA };
  };

  it("Successfully submits response", async () => {
    const { taskPDA } = await depositFunds();
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

    const responseAcc = await program.account.responseAccount.fetch(responsePDA);
    expect(responseAcc.cid).to.equal("QmTestCID");
    expect(responseAcc.responder.toBase58()).to.equal(responder.publicKey.toBase58());
  });

  it("Fails if deadline has passed", async () => {
    // 3s
    const deadline = new anchor.BN(new Date().getTime() / 1000 + 3);

    const { taskPDA } = await depositFunds(deadline);
    const responder = Keypair.generate();
    const [responsePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("response"), taskPDA.toBuffer(), responder.publicKey.toBuffer()],
      program.programId
    );

    await new Promise((r) => setTimeout(r, 4000));

    try {
      await program.methods
        .submitResponse("QmLate")
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA,
          responder: responder.publicKey,
          admin: wallet.publicKey,
          adminAccount: adminAccountPDA,
        })
        .rpc();
      console.log("Should have failed: deadline passed");
      assert.fail("Should have failed: deadline passed");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("DeadlinePassed");
    }
  });

  it("Fails if max responses reached", async () => {
    const maxResponses = 1;
    const { taskPDA } = await depositFunds(undefined, maxResponses);

    const responder1 = Keypair.generate();
    const [responsePDA1] = PublicKey.findProgramAddressSync(
      [Buffer.from("response"), taskPDA.toBuffer(), responder1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .submitResponse("QmCID1")
      .accountsPartial({
        taskAccount: taskPDA,
        responseAccount: responsePDA1,
        responder: responder1.publicKey,
        admin: wallet.publicKey,
        adminAccount: adminAccountPDA,
      })
      .rpc();

    const responder2 = Keypair.generate();
    const [responsePDA2] = PublicKey.findProgramAddressSync(
      [Buffer.from("response"), taskPDA.toBuffer(), responder2.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .submitResponse("QmCID2")
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA2,
          responder: responder2.publicKey,
          admin: wallet.publicKey,
          adminAccount: adminAccountPDA,
        })
        .rpc();
      assert.fail("Should have failed: max responses reached");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("MaxResponsesReached");
    }
  });

  it("Fails if same responder tries twice", async () => {
    const { taskPDA } = await depositFunds();

    const responder = Keypair.generate();
    const [responsePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("response"), taskPDA.toBuffer(), responder.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .submitResponse("QmOnce")
      .accountsPartial({
        taskAccount: taskPDA,
        responseAccount: responsePDA,
        responder: responder.publicKey,
        admin: wallet.publicKey,
        adminAccount: adminAccountPDA,
      })
      .rpc();

    try {
      await program.methods
        .submitResponse("QmTwice")
        .accountsPartial({
          taskAccount: taskPDA,
          responseAccount: responsePDA,
          responder: responder.publicKey,
          admin: wallet.publicKey,
          adminAccount: adminAccountPDA,
        })
        .rpc();
      assert.fail("Should fail: duplicate response");
    } catch (err) {
      expect(err.message).to.include("already in use");
    }
  });
});
