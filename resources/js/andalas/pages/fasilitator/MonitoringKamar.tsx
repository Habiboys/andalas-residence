import { PageHeader, Card } from '../../components/ui';
import { RoomGridMap } from '../../components/organisms/RoomGridMap';

type GedungRow = {
    lantai?: Array<{
        kamar?: Array<{
            id: string;
            nomor_kamar: string;
            kapasitas: number;
            status: string;
            penempatan_kamar?: unknown[];
        }>;
    }>;
};

type Props = {
    gedung: GedungRow[];
};

export default function MonitoringKamar({ gedung = [] }: Props) {
    const rooms = gedung.flatMap((g) =>
        (g.lantai ?? []).flatMap((l) =>
            (l.kamar ?? []).map((k) => ({
                ...k,
                okupansi: k.penempatan_kamar?.length ?? 0,
            })),
        ),
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Monitoring Kamar"
                subtitle="Status kamar wilayah fasilitator"
            />
            <Card className="p-5">
                <RoomGridMap rooms={rooms as never} />
            </Card>
        </div>
    );
}
