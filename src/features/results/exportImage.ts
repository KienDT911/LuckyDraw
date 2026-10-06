import { toJpeg, toPng } from 'html-to-image';
import { downloadBlob } from '../../shared/format';

const PIXEL_RATIO = 2;

function renderOptions(width: number, height: number) {
  return {
    width,
    height,
    pixelRatio: PIXEL_RATIO,
    cacheBust: false,
    // The stage is CSS-scaled and centred in the window; export it unscaled at the origin. `inset` must be
    // reset too: html-to-image copies the computed inset, which would otherwise win over `top`.
    style: { transform: 'none', position: 'relative', inset: 'auto', left: '0', top: '0' },
    filter: (node: HTMLElement) => !(node instanceof HTMLElement && node.dataset?.noexport !== undefined),
  };
}

export async function exportStagePng(node: HTMLElement, width: number, height: number, fileName: string) {
  const dataUrl = await toPng(node, renderOptions(width, height));
  downloadBlob(await (await fetch(dataUrl)).blob(), `${fileName}.png`);
}

export async function exportStagePdf(node: HTMLElement, width: number, height: number, fileName: string) {
  const [{ jsPDF }, dataUrl] = await Promise.all([
    import('jspdf'),
    toJpeg(node, { ...renderOptions(width, height), quality: 0.92 }),
  ]);
  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
    compress: true,
  });
  pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
  downloadBlob(pdf.output('blob'), `${fileName}.pdf`);
}
