import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="mark">Boarding Pass</div>
            <p>We curate unforgettable travel experiences with small groups and expert guides. Based in Mumbai, designing unhurried journeys since 2016.</p>
          </div>
          <div className="footer-col">
            <h4>Trips</h4>
            <ul>
              <li><Link href="/tours">All journeys</Link></li>
              <li>Small Group Tours</li>
              <li>Tailor-made Holidays</li>
              <li>Private departures</li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li>Gallery</li>
              <li>Travel Blogs</li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-col footer-contact">
            <h4>Get In Touch</h4>
            <p className="phone">+91 96005 87100</p>
            <p>info@boardingpasstours.com</p>
            <p style={{ marginTop: 14 }}>41, Shree Dhanalaxmi CHS,<br/>Taikalwadi, Mahim,<br/>Mumbai 400016</p>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 Boarding Pass Tours · Mumbai</div>
          <div className="footer-social">
            <a href="https://instagram.com/boardingpass.tours" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://facebook.com/boardingpasstour" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://linkedin.com/company/boardingpass-tours" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
          <div>Where Every Stamp Tells A Story</div>
        </div>
      </div>
    </footer>
  );
}
