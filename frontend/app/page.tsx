import Image from "next/image";


export default function Home() {
  return (
    <div>
      <Image src={'/logo/banner.jpg'} alt="Banner" width={1200} height={800} className="w-full h-screen object-cover" />
    </div>
  );
}
