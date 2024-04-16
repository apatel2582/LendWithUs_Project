// hooks/useDefaultLoan.ts
import { use, useContext } from "react";
import { useLoan } from "../context/LoanContext";
import LoanValidator from "../contracts/loan.hl";
import WalletConnector from "../components/WalletConnector";
import WalletInfo from "../components/WalletInfo";
import {
  Address,
  Cip30Wallet,
  Datum,
  NetworkParams,
  Value,
  TxOutput,
  Tx,
  WalletHelper,
  PubKeyHash,
} from "@hyperionbt/helios";
import {
  getNetworkParams,
  network,
  getLoanUtxo,
  getRepaymentUtxo,
} from "../common/network";

const optimize = false;
const useDefaultLoan = (
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setTx: React.Dispatch<React.SetStateAction<{ txId: string }>>
) => {
  const { setLoanDetails } = useLoan();
  const defaultLoan = async (walletAPI: any) => {
    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      // Create a new wallet helper instance
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      // Convert the ADA amount to lovelace
      const minAda: number = 1000000; // minimum lovelace to send
      const minAdaVal = new Value(BigInt(minAda));

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Get receiving address(es)
      const receivingAddr = await walletHelper.allAddresses;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Load in the loan validator script (program)
      const loanProgram = new LoanValidator();

      // Compile the loan validator
      const loanCompiledProgram = loanProgram.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(loanCompiledProgram);

      // Get the UTXO(s) locked at the loan contract (if any)
      const loanUtxo = await getLoanUtxo(
        Address.fromHashes(loanCompiledProgram.validatorHash)
      );

      // Create the loan claim redeemer
      const loanRedeemer =
        new loanProgram.types.LoanActions.Default()._toUplcData();

      // Check that UTXO input exists
      if (loanUtxo) {
        tx.addInput(loanUtxo, loanRedeemer);
      } else {
        throw console.error(
          "No UTXOs found at loan contract address: ",
          Address.fromHashes(loanCompiledProgram.validatorHash).toBech32
        );
      }

      // Construct the output to send the unlocked funds to
      tx.addOutput(
        new TxOutput(
          receivingAddr[0], // send to the frist receiving address
          new Value(minAdaVal.lovelace)
        )
      );

      // Add the public key hash as a required signer to the transaction
      tx.addSigner(receivingAddr[0].pubKeyHash!);

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);

      // Submit the signed tx
      const txHash = await cip30WalletAPI.submitTx(tx);

      setTx({ txId: txHash.hex });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      throw console.error("submit tx failed", err);
    }
  };
  return defaultLoan;
};

export default useDefaultLoan;
