import LandingContentList, {
    type LandingRow,
} from '../../components/LandingContentList';

export default function KelolaInformasi({
    informasi = [],
}: {
    informasi?: LandingRow[];
}) {
    return <LandingContentList section="informasi" rows={informasi} />;
}
