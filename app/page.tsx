import Image from "next/image";
import { wedding } from "./content/wedding";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__image">
          <Image
            src="/katie-tyler-hero-film.jpg"
            alt="Katie and Tyler"
            fill
            priority
            sizes="100vw"
          />
        </div>
      </section>

      <section className="home-lockup" aria-label="Wedding details">
        <h1>{wedding.couple}</h1>
        <p>
          Sunday, April 4th, 2027
          <br />
          {wedding.city}
        </p>
      </section>
    </div>
  );
}
