import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import { createTask, generateAdminPDA } from "./test-utils";

describe("nodara - deposit_funds", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const getExpectedNet = (amount: anchor.BN) =>
    Math.floor(amount.toNumber() * (1000 - 69) / 1000);

  const [adminAccountPDA] = generateAdminPDA(program);
  const adminAuthority = wallet.publicKey;

  it("Succeeds on first deposit", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);
    const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    await program.methods.depositFunds(taskId, depositAmount).accountsPartial({
      creator: wallet.publicKey,
      taskAccount: taskPDA,
      rewardVault: vaultPDA,
      adminAccount: adminAccountPDA,
      adminAuthority,
    }).rpc();

    const account = await program.account.rewardVault.fetch(vaultPDA);
    const expected = getExpectedNet(depositAmount);
    assert.equal(account.balance.toNumber(), expected);
  });

  it("Allows multiple deposits (adds up)", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);
    const amounts = [
      new anchor.BN(0.02 * LAMPORTS_PER_SOL),
      new anchor.BN(0.04 * LAMPORTS_PER_SOL),
    ];

    for (const amt of amounts) {
      await program.methods.depositFunds(taskId, amt).accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      }).rpc();
    }

    const account = await program.account.rewardVault.fetch(vaultPDA);
    const expectedTotal = amounts.map(getExpectedNet).reduce((a, b) => a + b, 0);
    assert.equal(account.balance.toNumber(), expectedTotal);
  });

  it("Fails on zero lamport deposit", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);

    try {
      await program.methods.depositFunds(taskId, new anchor.BN(0)).accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      }).rpc();
      assert.fail("Expected failure");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidDepositAmount");
    }
  });

  it("Fails with incorrect vault PDA", async () => {
    const { taskId, taskPDA } = await createTask(wallet.publicKey, program);
    const fakeVault = Keypair.generate().publicKey;
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    try {
      await program.methods.depositFunds(taskId, amount).accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: fakeVault,
        adminAccount: adminAccountPDA,
        adminAuthority,
      }).rpc();
      assert.fail("Expected seeds constraint failure");
    } catch (err: any) {
      expect(err.message).to.include("A seeds constraint was violated");
    }
  });

  it("Fails with non-creator signer", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);
    const fakeUser = Keypair.generate();
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    const sig = await provider.connection.requestAirdrop(fakeUser.publicKey, LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods.depositFunds(taskId, amount).accountsPartial({
        creator: fakeUser.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      }).signers([fakeUser]).rpc();
      assert.fail("Should fail with wrong creator");
    } catch (err: any) {
      expect(err.message).to.include("A seeds constraint was violated");
    }
  });

  it("Fails with mismatched admin authority", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
    const fakeAuthority = Keypair.generate();

    try {
      await program.methods.depositFunds(taskId, amount).accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority: fakeAuthority.publicKey,
      }).rpc();
      assert.fail("Should fail on constraint mismatch");
    } catch (err: any) {
      expect(err.message).to.include("AnchorError caused by account: admin_authority.");
    }
  });

  it("Handles very small deposits (rounding)", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);
    const smallAmount = new anchor.BN(1000); // 0.000001 SOL

    await program.methods.depositFunds(taskId, smallAmount).accountsPartial({
      creator: wallet.publicKey,
      taskAccount: taskPDA,
      rewardVault: vaultPDA,
      adminAccount: adminAccountPDA,
      adminAuthority,
    }).rpc();

    const account = await program.account.rewardVault.fetch(vaultPDA);
    const expected = getExpectedNet(smallAmount);
    assert.equal(account.balance.toNumber(), expected);
  });

  it("Fails if admin_authority not passed", async () => {
    const { taskId, taskPDA, vaultPDA } = await createTask(wallet.publicKey, program);
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    try {
      await program.methods.depositFunds(taskId, amount).accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
      }).rpc();
      assert.fail("Should have failed due to missing admin_authority");
    } catch (err: any) {
      expect(err.message).to.include("Account `adminAuthority` not provided.");
    }
  });
});
