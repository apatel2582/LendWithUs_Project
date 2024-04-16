// hooks/useLock.ts
import { useContext, useEffect } from "react";
import { useLoan } from "../context/LoanContext";
import RepaymentValidator from "../contracts/repayment.hl";
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
const useRepayment = (
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setTx: React.Dispatch<React.SetStateAction<{ txId: string }>>
) => {
  const { loanDetails, setLoanDetails } = useLoan();
  useEffect(() => {
    // Fetch loan details from the JSON file in the public directory
    const fetchLoanDetails = async () => {
      try {
        const response = await fetch("../public/loandetails.json");
        const data = await response.json();
        setLoanDetails({
          lenderAddress: data.lenderAddress,
          borrowerAddress: data.borrowerAddress,
          principalAmount: data.principalAmount,
          totalDue: data.totalDue,
        });
      } catch (error) {
        console.error("Failed to load loan details:", error);
      }
    };

    fetchLoanDetails();
  }, [setLoanDetails]);
  const repayment = async (walletAPI: any) => {
    setIsLoading(true);
    if (!walletAPI) {
      console.error("walletAPI is not set");
      setIsLoading(false);
      return;
    }
    try {
      const lenderAdd: any = loanDetails.lenderAddress;
      console.log("Lender Add:", lenderAdd);
      console.log("typeof Lender Add:", typeof lenderAdd);
      const lenderADDR = new Address(lenderAdd);
      console.log("Lender ADDR:", lenderADDR);
      console.log("typeof Lender ADDR:", typeof lenderADDR);
      // lender + borrower + totalDue(Int)
      const borrwerAdd: any = loanDetails.borrowerAddress;
      console.log("Borrower Add:", borrwerAdd);
      console.log("typeof Borrower Add:", typeof borrwerAdd);
      const borrowerADDR = new Address(borrwerAdd);
      console.log("Borrower ADDR:", borrowerADDR);
      console.log("typeof Borrower ADDR:", typeof borrowerADDR);
      const totalDue = loanDetails.totalDue;
      console.log("Total Due:", totalDue);
      console.log("typeof Total Due:", typeof totalDue);
      const amtqty = totalDue;
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda: number = amtqty;
      const minAdaVal = new Value(BigInt(minAda));
      const utxos = await walletHelper.pickUtxos(minAdaVal);
      const changeAddr = await walletHelper.changeAddress;
      const lender: Address = new Address(
        "addr_test1qz85p0a5ezcvx88rtt57xwr8kxhkqn7lse9ca0zynq5vqenuun9z9g2gknjjcu3wh7fcw4a44f5dy8j6xn2x7wdj4mjqw9yasr"
      );

      const tx = new Tx();
      tx.addInputs(utxos[0]);
      const repaymentProgram = new RepaymentValidator();
      const repaymentCompiledProgram = repaymentProgram.compile(optimize);
      console.log("Repayment Program:", repaymentCompiledProgram);

      const repaymentDatum = new repaymentProgram.types.RepaymentDatum({
        lender: lenderADDR.pubKeyHash,
        borrower: borrowerADDR.pubKeyHash,
        totalDue: loanDetails.totalDue,
      });

      console.log("Repayment Datum:", repaymentDatum);

      tx.addOutput(
        new TxOutput(
          Address.fromHashes(repaymentCompiledProgram.validatorHash),
          new Value(minAdaVal.lovelace),
          Datum.inline(repaymentDatum)
        )
      );

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
  return repayment;
};

export default useRepayment;
