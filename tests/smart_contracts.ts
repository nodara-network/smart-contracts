import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContracts } from "../target/types/smart_contracts";

describe("smart_contracts", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;

  it("Say Hello!", async () => {
    const tx = await program.methods.sayHello().rpc();
    console.log("Your transaction signature", tx);
  });
});
