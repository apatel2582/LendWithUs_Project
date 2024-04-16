import type { NextApiRequest, NextApiResponse } from "next";

import { network } from "../../common/network";
import { Address, BlockfrostV0, TxInput } from "@hyperionbt/helios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const getLoanUtxo = async (loanValidatorAddr: string): Promise<TxInput> => {
    const apiKey = process.env.BLOCKFROST_API_KEY as string;
    if (!apiKey) {
      throw console.error("BLOCKFROST_API_KEY not set");
    }
    const blockfrostAPI = new BlockfrostV0(network, apiKey);
    const loanUTXOs = await blockfrostAPI.getUtxos(
      Address.fromBech32(loanValidatorAddr)
    );
    if (loanUTXOs.length < 1) {
      throw console.error(
        "No UTXOs found at vesting address: ",
        loanValidatorAddr
      );
    }
    return loanUTXOs[0]; // only return the first UTXO
  };
  try {
    const txInput = await getLoanUtxo(req.body.addr);
    res.status(200).send(txInput.toFullCbor());
  } catch (err) {
    res.status(500).json("getLoanUtxo API error: " + err);
  }
}
