// pages/index.tsx
import NeteasePlayer from '../components/neteasePlayer';

const Home = () => {
  return (
      <main className="min-h-screen bg-gray-100 flex flex-col"> {/* Use flex-col here for NeteasePlayer to take height */}
        <NeteasePlayer />
      </main>
  );
};

export default Home;