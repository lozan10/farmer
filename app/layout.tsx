import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'FarmerLink Intelligence',description:'Unified agricultural operations intelligence across farms, supply, trading and traceability.'};export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
