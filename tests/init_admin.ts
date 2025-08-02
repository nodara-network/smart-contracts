import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContracts } from "../target/types/smart_contracts";

describe("nodara - init_admin", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.smartContracts as Program<SmartContracts>;

  it("Init Admin Account", async () => {
    await program.methods.initAdmin().rpc();
  });
});
