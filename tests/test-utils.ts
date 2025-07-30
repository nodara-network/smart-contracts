import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { SmartContracts } from "../target/types/smart_contracts";

export const generateTaskPDA = (creator: PublicKey, taskId: anchor.BN, program: Program<SmartContracts>) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("task"), creator.toBuffer(), Buffer.from(taskId.toArray("le", 8))],
    program.programId
  );

export const generateVaultPDA = (taskPDA: PublicKey, program: Program<SmartContracts>) =>
  PublicKey.findProgramAddressSync([Buffer.from("vault"), taskPDA.toBuffer()], program.programId);

export const generateAdminPDA = (program: Program<SmartContracts>) =>
  PublicKey.findProgramAddressSync([Buffer.from("admin")], program.programId);

export const validTaskInput = async (publicKey: PublicKey, program: Program<SmartContracts>) => {
  const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
  const rewardPerResponse = new anchor.BN(100_000); // 0.1 SOL
  const maxResponses = 5;
  const deadline = new anchor.BN(Math.floor(Date.now() / 1000 + 3600)); // 1 hour later
  const cid = "QmValidCIDHash";
  const [taskPDA, bump] = generateTaskPDA(publicKey, taskId, program);

  return {
    taskId,
    rewardPerResponse,
    maxResponses,
    deadline,
    cid,
    taskPDA,
    bump,
  };
};


export const createTask = async (
  publicKey: PublicKey,
  program: Program<SmartContracts>,
  responses?: number
) => {
  const taskId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
  const rewardPerResponse = new anchor.BN(100_000);
  const maxResponses = responses || 10;
  const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
  const cid = "QmCID" + taskId.toString();

  const [taskPDA] = generateTaskPDA(publicKey, taskId, program);
  const [vaultPDA] = generateVaultPDA(taskPDA, program);

  await program.methods
    .createTask(taskId, rewardPerResponse, maxResponses, deadline, cid)
    .accounts({ creator: publicKey })
    .rpc();

  return { taskId, taskPDA, vaultPDA, maxResponses, rewardPerResponse };
};

export const depositFunds = async (
  taskId: anchor.BN,
  taskPDA: PublicKey,
  vaultPDA: PublicKey,
  amount: anchor.BN,
  program: Program<SmartContracts>,
) => {
  const [adminAccountPDA] = generateAdminPDA(program);
  const adminAuthority = program.provider.wallet.publicKey;
  const creator = program.provider.wallet.publicKey;

  await program.methods
    .depositFunds(taskId, amount)
    .accountsPartial({
      creator,
      taskAccount: taskPDA,
      rewardVault: vaultPDA,
      adminAccount: adminAccountPDA,
      adminAuthority,
    })
    .rpc();
};

export const submitResponse = async (taskPDA: PublicKey, responder: Keypair, cid: string, program: Program<SmartContracts>, provider: anchor.Provider) => {
  const [responsePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("response"), taskPDA.toBuffer(), responder.publicKey.toBuffer()],
    program.programId
  );
  const [adminAccountPDA] = generateAdminPDA(program);
  const adminAuthority = provider.wallet.publicKey;

  // Airdrop if needed
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
};