// pages/api/loan.ts
import { PubKeyHash, Address } from "@hyperionbt/helios";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

type LoanDetails = {
  lenderAddress: null | "" | string;
  borrowerAddress: null | "" | string;
  principalAmount: number;
  totalDue: number;
};

// Path to your JSON file
const jsonFilePath = path.join(process.cwd(), "public", "loanDetails.json");

// READ Loan Details
const getLoanDetails = (): LoanDetails | null => {
  try {
    const jsonString = fs.readFileSync(jsonFilePath, "utf-8");
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to read the file:", error);
    return null;
  }
};

// WRITE Loan Details
const saveLoanDetails = (data: LoanDetails) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(jsonFilePath, jsonString, "utf-8");
  } catch (error) {
    console.error("Failed to write the file:", error);
  }
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoanDetails | { error: string }>
) {
  if (req.method === "GET") {
    const data = getLoanDetails();
    if (data) {
      res.status(200).json(data);
    } else {
      res.status(500).json({ error: "Unable to fetch loan details" });
    }
  } else if (req.method === "POST") {
    saveLoanDetails(req.body);
    res.status(200).json(req.body);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
