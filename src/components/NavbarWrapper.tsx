import Navbar from './NavbarClient';

// NavbarWrapper is a simple pass-through component.
// Categories are fetched client-side in NavbarClient to avoid
// build-time database connections which cause static page generation timeouts.
export default function NavbarWrapper() {
  return <Navbar categories={[]} />;
}
