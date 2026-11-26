import LoadingScreen from '../components/LoadingScreen';

export default function LoadingPage() {
    return (
        <LoadingScreen 
            autoProgress={true}
            duration={3000}
            showControls={true}
        />
    );
}
