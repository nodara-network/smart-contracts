import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SmartContracts } from "../target/types/smart_contracts";

describe("nodara - magicblock", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const providerEphemeralRollup = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.PROVIDER_ENDPOINT || "https://devnet.magicblock.app/",
      {
        wsEndpoint: process.env.WS_ENDPOINT || "wss://devnet.magicblock.app/",
      }
    ),
    anchor.Wallet.local()
  );

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

  let taskPDA: PublicKey;

  it("Delegate Tasks", async () => {
    const { taskPDA: pda, taskId } = await createTask();
    taskPDA = pda;
    console.log(taskPDA.toBase58());
    

    const tx = await program.methods
      .delegateTaskAccount(taskId)
      .accounts({
        creator: wallet.publicKey,
        taskAccount: taskPDA
      })
      .rpc();

    console.log(`https://explorer.solana.com/tx/${tx}/?cluster=devnet`);
  })

  it("Undelegate Tasks", async () => {
    let tx = await program.methods
      .undelegateTaskAccount()
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA
      })
      .transaction()

    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (
      await provider.connection.getLatestBlockhash()
    ).blockhash;

    // Then, sign with the ephemeral rollup wallet
    tx = await providerEphemeralRollup.wallet.signTransaction(tx);

    const txHash = await anchor.web3.sendAndConfirmTransaction(providerEphemeralRollup.connection, tx, [wallet.payer], {
      skipPreflight: true,
      commitment: "confirmed"
    })
    console.log(`https://explorer.solana.com/tx/${txHash}/?cluster=custom&customUrl=https%3A%2F%2Fdevnet.magicblock.app`);
  })
});