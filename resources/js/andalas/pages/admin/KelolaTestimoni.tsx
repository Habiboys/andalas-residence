import LandingContentList, {
    type LandingRow,
} from '../../components/LandingContentList';

export default function KelolaTestimoni({
    testimoni = [],
}: {
    testimoni?: LandingRow[];
}) {
    return <LandingContentList section="testimoni" rows={testimoni} />;
}
