import { LoanProvider } from "../context/LoanContext";
import "../styles/globals.css";
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <LoanProvider>
      <Component {...pageProps} />
    </LoanProvider>
  );
}

export default MyApp;
