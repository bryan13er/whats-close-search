import './page.css';
import NavPill from '@/components/NavPill';
import BottomSheet from '@/components/BottomSheet';

/*
  On mobile:  BottomSheet anchors itself to the bottom of the screen and
              provides the draggable sheet UI. NavPill renders inside it.
  On desktop: BottomSheet passes children through a centred shell (no sheet).
  The map background is always present but hidden on desktop via CSS.
*/
export default function Home() {
  return (
    <>
      {/* Decorative satellite-style map background — mobile only via CSS */}
      <div className="page-map-bg" aria-hidden="true" />

      <BottomSheet>
        <NavPill />
      </BottomSheet>
    </>
  );
}
