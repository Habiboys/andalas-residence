import { QuestionnaireItem } from './QuestionnaireItem';

export type KuesionerPertanyaan = {
    id: string;
    kode_pertanyaan: string;
    teks_pertanyaan: string;
    tipe_jawaban: string;
    bobot: number;
    skor_minimal: number;
    skor_maksimal: number;
    wajib: boolean;
    opsi?: Array<{ id: string; label: string; nilai_skor: number }>;
};

type Props = {
    pertanyaan: KuesionerPertanyaan[];
    answers: Record<string, { nilai_skor?: number; jawaban_teks?: string }>;
    onChange: (pertanyaanId: string, value: { nilai_skor?: number; jawaban_teks?: string }) => void;
};

export function TechnicianAssessment({ pertanyaan, answers, onChange }: Props) {
    return (
        <div className="space-y-4">
            {pertanyaan.map((p) => (
                <QuestionnaireItem
                    key={p.id}
                    pertanyaan={p}
                    value={answers[p.id]}
                    onChange={(val) => onChange(p.id, val)}
                />
            ))}
        </div>
    );
}
