import type { NextPage } from "next";
import Image from "next/image";
import Head from "next/head";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  use,
} from "react";

import { useLoan } from "../context/LoanContext";
import LoadingSpinner from "../components/LoadingSpinner";
import Lock from "../components/Lock";
import LoanNow from "../components/LoanNow";
import DefaultLoan from "../components/DefaultLoan";
import Repayment from "../components/Repayment";
import ClaimBack from "../components/ClaimBack";
import useClaimBack from "../hooks/useClaimBack";
import useLock from "../hooks/useLock";
import useLoanNow from "../hooks/useLoanNow";
import useDefaultLoan from "../hooks/useDefaultLoan";
import useRepayment from "../hooks/useRepayment";
import {
  getNetworkParams,
  network,
  getLoanUtxo,
  getRepaymentUtxo,
} from "../common/network";
import LoanValidator from "../contracts/loan.hl";
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
} from "@hyperionbt/helios";

const optimize = false;

function useClearLoanDetails() {
  const context = useLoan();

  if (!context) {
    throw new Error("useClearLoanDetails must be used within a LoanProvider");
  }

  const { setLoanDetails } = context;

  const clearLoanDetails = () => {
    localStorage.removeItem("loanDetails");
    setLoanDetails({
      lenderAddress: "",
      borrowerAddress: "",
      principalAmount: 0,
      totalDue: 0,
    });
  };

  return clearLoanDetails;
}

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tx, setTx] = useState({ txId: "" });
  const [walletAPI, setWalletAPI] = useState<undefined | any>(undefined);
  const [walletInfo, setWalletInfo] = useState({
    balance: "",
  });

  const lock = useLock(setIsLoading, setTx);

  const loannow = useLoanNow(setIsLoading, setTx);

  const defaultloan = useDefaultLoan(setIsLoading, setTx);

  const repayment = useRepayment(setIsLoading, setTx);

  const claimback = useClaimBack(setIsLoading, setTx);

  useEffect(() => {
    // Calculate the wallet balance
    const getWalletBalance = async () => {
      try {
        const cip30WalletAPI = new Cip30Wallet(walletAPI);
        const walletHelper = new WalletHelper(cip30WalletAPI);
        const balanceAmountValue = await walletHelper.calcBalance();

        // Extract the balance amount in lovelace
        const balanceAmount = balanceAmountValue.lovelace;

        // Format the balance as a locale string
        return balanceAmount.toLocaleString();
      } catch (error) {
        console.error("Error in getWalletBalance:", error);
        throw new Error(
          "Failed to retrieve wallet balance. Please try again later."
        );
      }
    };

    const updateWalletInfo = async () => {
      if (walletAPI) {
        const _balance = (await getWalletBalance()) as string;
        setWalletInfo({
          balance: _balance,
        });
      } else {
        // Zero out wallet info if no walletAPI is present
        setWalletInfo({
          balance: "",
        });
      }
    };
    updateWalletInfo();
  }, [walletAPI]);

  const handleLock = async (amount: number) => {
    if (walletAPI) {
      await lock(walletAPI, amount);
    } else {
      console.error("walletAPI is not set");
    }
  };

  const handleLoanNow = async (message: string) => {
    if (walletAPI) {
      await loannow(walletAPI, message);
    } else {
      console.error("walletAPI is not set");
    }
  };

  const handleDefaultLoan = async () => {
    if (walletAPI) {
      await defaultloan(walletAPI);
    } else {
      console.error("walletAPI is not set");
    }
  };

  const handleRepayment = async () => {
    if (walletAPI) {
      await repayment(walletAPI);
    } else {
      console.error("walletAPI is not set");
    }
  };

  const handleClaimBack = async (message: string) => {
    if (walletAPI) {
      await claimback(walletAPI, message);
    } else {
      console.error("walletAPI is not set");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <Head>
        <title>LendWithUs Prototype</title>
        <meta name="description" content="LendWithUs Prototype" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="w-full flex justify-center items-center p-4">
        <div className="flex justify-start items-center absolute left-0 ml-10">
          <Image
            src="/logo_lws.png"
            alt="LendWithUs Logo"
            width={180}
            height={180}
          />
        </div>
        <h1 className="text-3xl font-semibold">
          LendWithUs Loan Smart Contract Prototype
        </h1>
      </header>
      <div className="bg-gray-100 min-h-screen flex flex-col">
        <main className="p-4 flex-grow mx-96">
          <div className="border border-gray-400 p-4 rounded">
            <WalletConnector onWalletAPI={setWalletAPI} />
          </div>
          {walletAPI && (
            <div className="border border-gray-400 p-4 rounded">
              <WalletInfo walletInfo={walletInfo} />
            </div>
          )}
          <div>
            <p> </p>
          </div>
          {tx.txId && walletAPI && (
            <div className="border border-gray-400 p-4 rounded">
              <b className="font-bold">Transaction Success!!!</b>
              <p>
                TxId: &nbsp;&nbsp;
                <a
                  href={"https://" + network + ".cexplorer.io/tx/" + tx.txId}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline text-xs"
                >
                  {tx.txId}
                </a>
              </p>
              <p className="mt-2">
                Please wait until the transaction is confirmed on the blockchain
                and reload this page before doing another transaction
              </p>
            </div>
          )}
          {walletAPI && !tx.txId && !isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <h5 className="text-xl font-semibold">The Loan Process</h5>
            </div>
          )}
          {walletAPI && !tx.txId && !isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <h6 className="text font-medium">
                Lender Locks the Amount(ADA) in the Loan
              </h6>
              <Lock onLock={handleLock} />
            </div>
          )}
          {walletAPI && !tx.txId && !isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <h6 className="text font-medium">
                Borrower withdraws the Loan Amount(ADA) with a Password
              </h6>
              <LoanNow onLoanNow={handleLoanNow} />
            </div>
          )}
          {walletAPI && !tx.txId && !isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <h6 className="text font-medium">
                Lender wants to cancel the loan before the borrower withdraws
                the loan
              </h6>
              <DefaultLoan onDefaultLoan={handleDefaultLoan} />
            </div>
          )}
          {walletAPI && !tx.txId && !isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <h6 className="text font-medium">
                Borrower Repays the Loan with Interest
              </h6>
              <Repayment onRepayment={handleRepayment} />
            </div>
          )}
          {walletAPI && !tx.txId && !isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <h6 className="text font-medium">
                Lender Claims Back the Loan with Interest
              </h6>
              <ClaimBack onClaimBack={handleClaimBack} />
            </div>
          )}
          {isLoading && (
            <div className="border border-gray-400 p-4 rounded">
              <LoadingSpinner />
            </div>
          )}
        </main>
        <footer className="bg-gray-800 text-white text-center p-4">
          <p className="text-sm">
            Made By <strong>LendWithUs Team</strong> using{" "}
            <strong>Helios on Cardano</strong>@
            <strong>George Brown College</strong> for Capstone Project
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
