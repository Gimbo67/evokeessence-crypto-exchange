import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useTranslations } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Container } from "@/components/ui/container";

export default function TeamPage() {
  const t = useTranslations();

  const team = [
    {
      name: "Jakob Volkenhoff",
      role: t('director'),
      avatar: "JV",
      image: "/assets/team/jakob_volkenhoff.jpg",
      bio: t('director_bio')
    },
    {
      name: "Sven Gensch",
      role: t('technical_director'),
      avatar: "SG",
      image: "/assets/team/sven_gensch.jpg",
      bio: t('technical_director_bio')
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <Header />
      <main className="flex-1 w-full">
        <section className="pt-24 pb-16">
          <Container>
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
              {t('our_team')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
              {t('team_subtitle')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {team.map((member) => (
                <Card key={member.name} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <Avatar className="h-24 w-24 mx-auto mb-4 ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
                        <AvatarImage 
                          src={member.image} 
                          alt={member.name}
                          className="object-top"
                          onError={(e) => {
                            console.log(`Loading fallback avatar for ${member.name}`);
                            e.currentTarget.src = "/assets/team/placeholder.jpg";
                            e.currentTarget.onerror = null;
                          }}
                        />
                        <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                      <p className="text-muted-foreground mb-4">{member.role}</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {member.bio}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}