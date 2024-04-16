// hooks/useLock.ts
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
const useLock = (
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setTx: React.Dispatch<React.SetStateAction<{ txId: string }>>
) => {
  const { setLoanDetails } = useLoan();
  const lock = async (walletAPI: any, amtqty: number) => {
    // Check if the loan amount is provided
    if (!amtqty) {
      console.error("No loan amount provided");
      return;
    }
    setIsLoading(true);
    if (!walletAPI) {
      console.error("walletAPI is not set");
      setIsLoading(false);
      return;
    }

    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda: number = amtqty * 1000000;
      const minAdaVal = new Value(BigInt(minAda));
      const utxos = await walletHelper.pickUtxos(minAdaVal);
      const changeAddr = await walletHelper.changeAddress;
      const borrower: Address = new Address(
        "addr_test1qrz3hacfmzrsgrfraptt2kgwsgmj0s4jy68269dnphqwfs064m3kngmhdp35ue0ydswdyms8w2fw6a69zx7k27daa9yshsdkzh"
      );
      const principalAmount = amtqty * 1000000;
      const interestRate = 10;
      const deadlineTimestamp = 1713481200;
      const totalDue = principalAmount + (principalAmount * interestRate) / 100;
      console.log("Principal Amount:", principalAmount);
      console.log("Interest Rate:", interestRate);
      console.log("Deadline Timestamp:", deadlineTimestamp);
      console.log("Total Due:", totalDue);
      console.log("changeAddr", changeAddr);
      console.log("borrower", borrower);
      console.log("typeof changeAddr", typeof changeAddr);
      console.log("typeof borrower", typeof borrower);

      setLoanDetails(() => ({
        lenderAddress:
          "addr_test1qz85p0a5ezcvx88rtt57xwr8kxhkqn7lse9ca0zynq5vqenuun9z9g2gknjjcu3wh7fcw4a44f5dy8j6xn2x7wdj4mjqw9yasr",
        borrowerAddress:
          "addr_test1qrz3hacfmzrsgrfraptt2kgwsgmj0s4jy68269dnphqwfs064m3kngmhdp35ue0ydswdyms8w2fw6a69zx7k27daa9yshsdkzh",
        principalAmount: principalAmount,
        totalDue: totalDue,
      }));

      const tx = new Tx();
      tx.addInputs(utxos[0]);
      const loanProgram = new LoanValidator();
      const compiledLoanProgram = loanProgram.compile(optimize);
      console.log("compiledLoanProgram", compiledLoanProgram);

      const loanDatum = new loanProgram.types.LoanDatum({
        lender: changeAddr.pubKeyHash, // Public key hash of the lender
        borrower: borrower.pubKeyHash, // Public key hash of the borrower
        principalAmount: principalAmount, // Principal loan amount
        totalDue: totalDue, // Total amount due
        deadline: deadlineTimestamp, // Deadline as a timestamp
        interestRate: interestRate, // Interest rate
        paymentDone: false, // Initial state of the payment
      });

      console.log("loanDatum", loanDatum);

      // Construct the output to send the minAda
      // and the inline datum to the script address
      tx.addOutput(
        new TxOutput(
          Address.fromHashes(compiledLoanProgram.validatorHash),
          new Value(minAdaVal.lovelace),
          Datum.inline(loanDatum)
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
  return lock;
};

export default useLock;
