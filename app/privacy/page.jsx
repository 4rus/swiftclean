import styles from './privacy.module.css'

export default function PrivacyPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>✦</div>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: April 2026</p>

        <section className={styles.section}>
          <h2>Who we are</h2>
          <p>INDIMOE Cleaning is a commercial cleaning company based in Calgary, Alberta, Canada. This privacy policy explains how we handle personal information collected through our job application form.</p>
        </section>

        <section className={styles.section}>
          <h2>What we collect</h2>
          <p>When you apply for a position, we collect:</p>
          <ul>
            <li>Full name, email address, and phone number</li>
            <li>City and availability</li>
            <li>Work experience</li>
            <li>Driver's licence information and photo</li>
            <li>Social Insurance Number (SIN)</li>
            <li>Emergency contact information</li>
            <li>References</li>
            <li>Resume (if provided)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Why we collect it</h2>
          <p>We collect this information solely for hiring and employment purposes. Your SIN is collected only for payroll and tax reporting (T4 slips) as required by the Canada Revenue Agency. We do not collect SINs from applicants who are not hired.</p>
        </section>

        <section className={styles.section}>
          <h2>Who can see your information</h2>
          <p>Only the hiring manager at INDIMOE Cleaning has access to your application. Your information is never shared with third parties, sold, or used for any purpose other than hiring and payroll.</p>
        </section>

        <section className={styles.section}>
          <h2>How we protect it</h2>
          <p>All data is stored securely using encrypted databases and private file storage. Your information is transmitted over HTTPS and is never stored in plain text. Access is restricted to authorized personnel only.</p>
        </section>

        <section className={styles.section}>
          <h2>How long we keep it</h2>
          <p>If you are not hired, your application data will be deleted within 90 days. If you are hired, your employment records are kept for a minimum of 7 years as required by Canadian tax law.</p>
        </section>

        <section className={styles.section}>
          <h2>Your rights</h2>
          <p>Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have the right to:</p>
          <ul>
            <li>Request access to your personal information</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Contact us</h2>
          <p>For any privacy-related questions or requests, contact us at:</p>
          <p><strong>INDIMOE Cleaning</strong><br />
          48 Castleridge Crescent NE, Calgary, AB T3J 1N7<br />
          📞 403-708-0886<br />
          ✉️ mohan_singh2010@rediffmail.com</p>
        </section>

        <a href="/careers" className={styles.backBtn}>← Back to application form</a>
      </div>
    </div>
  )
}