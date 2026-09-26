import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vite-plus/test';
import ApprovalPengajuan from './ApprovalPengajuan';
it('shows evidence links and review decisions for a paid legacy application',()=>{const html=renderToStaticMarkup(<ApprovalPengajuan bebas_asrama={[{id:'one',nomor_pengajuan:'BA-ONE',status:'diajukan',legacy_verification_path:'alumni_paid',payment_evidence_path:'proof.pdf',bank_statement_path:'bank.pdf',mahasiswa:{user:{nama:'Mahasiswa A',nim_nip:'21100001'}}}]}/>);for(const label of ['Mahasiswa A','Bukti bayar','Rekening koran','Simpan keputusan'])expect(html).toContain(label);});
it('keeps issued letters downloadable without an approval form',()=>{const html=renderToStaticMarkup(<ApprovalPengajuan bebas_asrama={[{id:'one',nomor_pengajuan:'BA-ONE',status:'disetujui',file_surat_path:'letter.pdf'}]}/>);expect(html).toContain('Unduh surat');expect(html).not.toContain('<form');});
it('shows an empty state',()=>{expect(renderToStaticMarkup(<ApprovalPengajuan/>)).toContain('Belum ada pengajuan.');});
