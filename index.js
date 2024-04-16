import * as helios from "@hyperionbt/helios";

const src = `
spending loannew
const VERSION: String = "v0.0.1" 

struct Datum {
    lender: PubKeyHash
}

enum Redeemer {
    Accept
}

func main(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
    tx: Tx = ctx.tx;
    redeemer.switch {
        Accept => {
            tx.is_signed_by(datum.lender)
        }
    }
}`;

const program = helios.Program.new(src);
const simplify = true;
const myUplcProgram = program.compile(simplify);
console.log(myUplcProgram.serialize());
