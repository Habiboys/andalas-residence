import LandingContentList, {
    type LandingRow,
} from '../../components/LandingContentList';

export default function KelolaProfil({
    contents = [],
}: {
    contents?: LandingRow[];
}) {
    return <LandingContentList section="profil" rows={contents} />;
}
