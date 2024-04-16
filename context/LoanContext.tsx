import { PubKeyHash, Address } from "@hyperionbt/helios";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface LoanDetails {
  lenderAddress: null | "" | string;
  borrowerAddress: null | "" | string;
  principalAmount: number;
  totalDue: number;
}

interface LoanContextType {
  loanDetails: LoanDetails;
  setLoanDetails: React.Dispatch<React.SetStateAction<LoanDetails>>;
}

const LoanContext = createContext<LoanContextType | null>(null);

export const useLoan = () => {
  const context = useContext(LoanContext);
  if (!context) throw new Error("useLoan must be used within a LoanProvider");
  return context;
};

// Define an interface for the props
interface LoanProviderProps {
  children: ReactNode;
}

export const LoanProvider: React.FC<LoanProviderProps> = ({ children }) => {
  const [loanDetails, setLoanDetails] = useState<LoanDetails>({
    lenderAddress: "",
    borrowerAddress: "",
    principalAmount: 0,
    totalDue: 0,
  });

  console.log(loanDetails);

  // Effect to handle localStorage
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        const response = await fetch("/api/loan");
        const data = await response.json();
        if (response.ok) {
          setLoanDetails(data);
        } else {
          throw new Error(data.error || "Failed to fetch loan details");
        }
      } catch (error) {
        console.error("Failed to load loan details:", error);
      }
    };

    fetchLoanDetails();
  }, []);

  // Update loan details on the server
  useEffect(() => {
    const saveLoanDetails = async () => {
      try {
        const response = await fetch("/api/loan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loanDetails),
        });
        if (!response.ok) {
          throw new Error("Failed to save loan details");
        }
      } catch (error) {
        console.error("Failed to save loan details:", error);
      }
    };

    if (loanDetails.lenderAddress || loanDetails.borrowerAddress) {
      saveLoanDetails();
    }
  }, [loanDetails]);

  return (
    <LoanContext.Provider value={{ loanDetails, setLoanDetails }}>
      {children}
    </LoanContext.Provider>
  );
};

export default LoanProvider;
