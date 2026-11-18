import Link from 'next/link';

const NotFound = () => (
  <div className="wrap missing">
    <div className="eyebrow">404</div>
    <h1>That page does not exist.</h1>
    <p>
      The skill may have been renamed. <Link href="/">See all skills</Link>.
    </p>
  </div>
);

export default NotFound;
