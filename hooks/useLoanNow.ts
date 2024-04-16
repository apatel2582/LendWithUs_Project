// hooks/useLoanNow.ts
import { useContext } from "react";
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
const useLoanNow = (
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setTx: React.Dispatch<React.SetStateAction<{ txId: string }>>
) => {
  const { setLoanDetails } = useLoan();
  const loannow = async (walletAPI: any, message: string) => {
    if (message.length < 1) {
      throw console.error("No redeemer message was provided");
    }
    console.log("Message:", message);
    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      const amount = 10;
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda: number = amount * 1000000;
      const minAdaVal = new Value(BigInt(minAda));
      console.log("Min ADA Value:", minAdaVal.lovelace);
      const utxos = await walletHelper.pickUtxos(minAdaVal);
      const changeAddr = await walletHelper.changeAddress;
      const receivingAddr = await walletHelper.allAddresses;

      const tx = new Tx();
      tx.addInputs(utxos[0]);

      const loanProgram = new LoanValidator();
      const compiledLoanProgram = loanProgram.compile(optimize);

      tx.attachScript(compiledLoanProgram);
      console.log("Loan Program:", compiledLoanProgram);
      const loanUtxo = await getLoanUtxo(
        Address.fromHashes(compiledLoanProgram.validatorHash)
      );
      console.log("Loan UTXO:", loanUtxo);
      const loanRedeemer = new loanProgram.types.LoanActions.Claim(
        message
      )._toUplcData();
      const newLoanUtxoValue = loanUtxo.value.lovelace;

      if (loanUtxo) {
        tx.addInput(loanUtxo, loanRedeemer);
      } else {
        throw console.error(
          "No UTXOs found at loan contract address: ",
          Address.fromHashes(compiledLoanProgram.validatorHash).toBech32
        );
      }

      tx.addOutput(new TxOutput(receivingAddr[0], new Value(newLoanUtxoValue)));

      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      await tx.finalize(networkParams, changeAddr, utxos[1]);

      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);

      const txHash = await cip30WalletAPI.submitTx(tx);

      setTx({ txId: txHash.hex });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      throw console.error("submit tx failed", err);
    }
  };
  return loannow;
};

export default useLoanNow;
