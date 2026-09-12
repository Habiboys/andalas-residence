import type { ReactNode } from 'react';

type Pertanyaan = {
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

type Props =
    | {
          code: string;
          question: string;
          required?: boolean;
          children: ReactNode;
      }
    | {
          pertanyaan: Pertanyaan;
          value?: { nilai_skor?: number; jawaban_teks?: string };
          onChange: (value: { nilai_skor?: number; jawaban_teks?: string }) => void;
      };

export function QuestionnaireItem(props: Props) {
    if ('pertanyaan' in props) {
        const { pertanyaan, value, onChange } = props;
        const min = pertanyaan.skor_minimal ?? 1;
        const max = pertanyaan.skor_maksimal ?? 5;

        return (
            <div className="space-y-3 rounded-box border border-base-300 p-4">
                <div>
                    {/* The question code is an identifier, so it keeps the fixed-width face. */}
                    <p className="text-identifier text-xs text-muted">
                        {pertanyaan.kode_pertanyaan}
                    </p>
                    <p className="font-medium">
                        {pertanyaan.teks_pertanyaan}
                        {pertanyaan.wajib && (
                            <span className="ml-1 text-error" aria-hidden="true">
                                *
                            </span>
                        )}
                        {pertanyaan.wajib && <span className="sr-only">(wajib diisi)</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">Bobot: {pertanyaan.bobot}</p>
                </div>

                {pertanyaan.tipe_jawaban === 'teks' ? (
                    <textarea
                        value={value?.jawaban_teks ?? ''}
                        onChange={(e) => onChange({ jawaban_teks: e.target.value })}
                        rows={3}
                        className="textarea w-full"
                    />
                ) : (
                    /*
                     * Score buttons use daisyUI's button tones rather than a
                     * hand-written `bg-gold text-white`, which would put white on
                     * the dark theme's light gold and fail contrast.
                     */
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((score) => {
                            const selected = value?.nilai_skor === score;

                            return (
                                <button
                                    key={score}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => onChange({ nilai_skor: score })}
                                    className={`btn w-10 ${
                                        selected ? 'btn-accent' : 'btn-outline'
                                    }`}
                                >
                                    {score}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    const { code, question, required = false, children } = props;

    return (
        <div className="space-y-3 rounded-box border border-base-300 p-4">
            <div>
                <p className="text-identifier text-xs text-muted">{code}</p>
                <p className="font-medium">
                    {question}
                    {required && (
                        <span className="ml-1 text-error" aria-hidden="true">
                            *
                        </span>
                    )}
                    {required && <span className="sr-only">(wajib diisi)</span>}
                </p>
            </div>
            {children}
        </div>
    );
}
