import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import useBreakpoint from "../hooks/useBreakpoint";

export default function Layout({ children }) {
  const { isMobile, isTablet } = useBreakpoint();

  const marginLeft = isMobile ? 0 : isTablet ? 72 : 240;
  const paddingBottom = isMobile ? 68 : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F4F6FA", display: "flex" }}>
      <Sidebar />
      <div style={{
        marginLeft,
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        transition: "margin-left 0.2s ease",
        width: isMobile ? "100%" : `calc(100% - ${marginLeft}px)`,
      }}>
        {!isMobile && <Navbar />}
        <main style={{
          flex: 1,
          paddingBottom,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
