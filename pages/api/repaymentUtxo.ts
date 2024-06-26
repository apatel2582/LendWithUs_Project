import type { NextApiRequest, NextApiResponse } from "next";

import { network } from "../../common/network";
import { Address, BlockfrostV0, TxInput } from "@hyperionbt/helios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const getRepaymentUtxo = async (
    repaymentValidatorAddr: string
  ): Promise<TxInput> => {
    const apiKey = process.env.BLOCKFROST_API_KEY as string;
    if (!apiKey) {
      throw console.error("BLOCKFROST_API_KEY not set");
    }
    const blockfrostAPI = new BlockfrostV0(network, apiKey);
    const repaymentUTXOs = await blockfrostAPI.getUtxos(
      Address.fromBech32(repaymentValidatorAddr)
    );
    if (repaymentUTXOs.length < 1) {
      throw console.error(
        "No UTXOs found at vesting address: ",
        repaymentValidatorAddr
      );
    }
    return repaymentUTXOs[0]; // only return the first UTXO
  };
  try {
    const txInput = await getRepaymentUtxo(req.body.addr);
    res.status(200).send(txInput.toFullCbor());
  } catch (err) {
    res.status(500).json("getRepaymentUtxo API error: " + err);
  }
}
