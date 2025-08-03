import { useTranslations } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function Team() {
  const t = useTranslations();

  const team = [
    {
      name: "Jakob Volkenhoff",
      role: t('director'),
      title: t('director'),
      image: "/assets/team/jakob_volkenhoff.jpg",
      bio: t('director_bio'),
    },
    {
      name: "Sven Gensch",
      role: t('technical_director'),
      title: t('technical_director'),
      image: "/assets/team/sven_gensch.jpg",
      bio: t('technical_director_bio'),
    }
  ];

  return (
    <section id="team" className="py-20 bg-background">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {t('team_title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('team_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {team.map((member) => (
            <Card key={member.name} className="group h-full overflow-hidden">
              <CardContent className="p-0">
                <div className="relative overflow-hidden w-full pb-[100%]">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      console.error(`Failed to load image for ${member.name}`);
                      e.currentTarget.src = "/assets/team/placeholder.jpg";
                      e.currentTarget.onerror = null;
                    }}
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors duration-300">
                    {member.name}
                  </h3>
                  <p className="text-lg text-muted-foreground font-medium mb-2">
                    {member.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {member.bio}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}