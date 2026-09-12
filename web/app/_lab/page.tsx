import Link from "next/link";
export default function Lab() {
  return (
    <div className="lab-idx">
      <h1>Console — direction explorations</h1>
      <p>Same real engine + all integrations. Different ways to make the mechanic understandable.</p>
      <Link className="lab-card" href="/lab/report"><h3>A · Report-first</h3><span>Lead with the actual verdict + plain-language metrics; edit shows what updated.</span></Link>
      <Link className="lab-card" href="/lab/pipeline"><h3>B · Pipeline (coming)</h3><span>Big left-to-right SOURCES → FACTS → METRICS → VERDICT, cone floods on edit.</span></Link>
    </div>
  );
}
