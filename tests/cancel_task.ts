import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { SmartContracts } from "../target/types/smart_contracts";
import { createTask, generateAdminPDA } from "./test-utils";

describe("nodara - cancel_task", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;
  const provider = anchor.getProvider();
  const wallet = provider.wallet;

  const [adminAccountPDA] = generateAdminPDA(program);
  const adminAuthority = wallet.publicKey;

  // Helper function to calculate fees
  const calculateFees = (amount: anchor.BN): number => {
    return Math.floor(amount.mul(new anchor.BN(69)).div(new anchor.BN(1000)).toNumber()); // Corrected denominator to 1000 for 6.9%
  };

  it("Succeeds on first deposit", async () => {
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

    const rent = await provider.connection.getMinimumBalanceForRentExemption(
      program.account.rewardVault.size
    );

    const vaultBalance = await provider.connection.getBalance(vaultPDA);
    const account = await program.account.rewardVault.fetch(vaultPDA);

    const fees = calculateFees(depositAmount);
    assert.equal(vaultBalance, depositAmount.toNumber() - fees + rent);
    assert.equal(account.balance.toNumber(), depositAmount.toNumber() - fees);
  });

  it("Allows multiple deposits (adds up)", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask(wallet.publicKey, program);
    const firstAmount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
    const secondAmount = new anchor.BN(0.03 * LAMPORTS_PER_SOL);

    // Calculate fees for the first deposit
    const firstFees = calculateFees(firstAmount);
    const firstNetDeposit = firstAmount.toNumber() - firstFees;

    await program.methods
      .depositFunds(taskId, firstAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      })
      .rpc();

    // Calculate fees for the second deposit
    const secondFees = calculateFees(secondAmount);
    const secondNetDeposit = secondAmount.toNumber() - secondFees;

    await program.methods
      .depositFunds(taskId, secondAmount)
      .accountsPartial({
        creator: wallet.publicKey,
        taskAccount: taskPDA,
        rewardVault: vaultPDA,
        adminAccount: adminAccountPDA,
        adminAuthority,
      })
      .rpc();

    const account = await program.account.rewardVault.fetch(vaultPDA);
    const totalExpectedBalance = firstNetDeposit + secondNetDeposit;

    assert.equal(account.balance.toNumber(), totalExpectedBalance);
  });

  it("Fails on zero lamport deposit", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask(wallet.publicKey, program);
    const zeroAmount = new anchor.BN(0);

    try {
      await program.methods
        .depositFunds(taskId, zeroAmount)
        .accountsPartial({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          adminAccount: adminAccountPDA,
          adminAuthority,
        })
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("InvalidDepositAmount");
    }
  });

  it("Fails when vault PDA is wrong", async () => {
    const { taskId, taskPDA } = await createTask(wallet.publicKey, program);
    const wrongVault = Keypair.generate().publicKey;
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    try {
      await program.methods
        .depositFunds(taskId, amount)
        .accountsPartial({
          creator: wallet.publicKey,
          taskAccount: taskPDA,
          rewardVault: wrongVault,
          adminAccount: adminAccountPDA,
          adminAuthority,
        })
        .rpc();
      assert.fail("Should have failed due to PDA mismatch");
    } catch (err: any) {
      expect(err.message).to.include("A seeds constraint was violated");
    }
  });

  it("Fails if not the task creator", async () => {
    const { vaultPDA, taskPDA, taskId } = await createTask(wallet.publicKey, program);

    const fakeUser = Keypair.generate();
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    // Fund the fake user
    const sig = await provider.connection.requestAirdrop(
      fakeUser.publicKey,
      0.1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .depositFunds(taskId, amount)
        .accountsPartial({
          creator: fakeUser.publicKey,
          taskAccount: taskPDA,
          rewardVault: vaultPDA,
          adminAccount: adminAccountPDA,
          adminAuthority,
        })
        .signers([fakeUser])
        .rpc();

      assert.fail("Should not succeed with wrong creator");
    } catch (err: any) {
      expect(err.message).to.include("A seeds constraint was violated");
    }
  });
});