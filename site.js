const CSLI18N = (() => {
    const storageKey = 'csl-language';
    const supportedLanguages = ['nl', 'en', 'pt', 'es', 'fr', 'de'];
    const locales = {
        nl: 'nl-NL',
        en: 'en-GB',
        pt: 'pt-PT',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE'
    };

    const translations = {
        nl: {
            meta: { booking: 'Casa Serra Larga | Boeken', payment: 'Casa Serra Larga | Betalen', paymentSuccess: 'Casa Serra Larga | Bevestigd', home: 'Casa Serra Larga | Welkom' },
            common: { brandSubtitle: 'B&B in Batalha, Portugal', footerLink: 'Bekijk de welkomspagina', bookNow: 'Boek nu', close: 'Sluiten' },
            home: { eyebrow: 'Casa Serra Larga', title: 'Ontdek, Geniet, Ontspan', intro: 'Reserveer een verblijf en ontdek wat alles wat Casa Serra Larga te bieden heeft', primaryCta: 'Boek je verblijf', secondaryCta: 'Ga naar reserveren', cardOneKicker: 'Stijl', cardOneTitle: 'Warm, gastvrij en kleinschalig', cardOneText: 'Jouw vakantie op onze mooiste plek', cardTwoKicker: 'Rust', cardTwoTitle: 'Kamers per stuk zichtbaar', cardTwoText: 'Je ziet per kamer meteen of ze nog vrij is in jouw periode.', cardThreeKicker: 'Praktisch', cardThreeTitle: 'Direct reserveren en betalen', cardThreeText: 'Kies kamers, bekijk je totaal en rond af via Stripe.' },
            booking: {
                eyebrow: 'Boek rechtstreeks, zonder giswerk',
                heroTitle: 'Kies je kamers, zie meteen de juiste prijs en zet je verblijf 10 minuten vast',
                heroText: 'Elke kamer heeft haar eigen beschikbaarheid, bezetting en prijsregels. Je selecteert precies wat je wilt boeken.',
                availabilityEyebrow: 'Stap 1',
                availabilityTitle: 'Selecteer data en kamers',
                availabilityIntro: 'Kies eerst je verblijfsperiode. Daarna tonen we per kamer of ze beschikbaar is en wat het exacte totaal wordt.',
                stayRangeLabel: 'Van - tot',
                stayRangePlaceholder: 'Kies je verblijfsperiode',
                extraBedLabel: 'Extra kinderbed',
                extraBedNote: 'EUR 15 per nacht per kamer',
                roomsTitle: 'Beschikbare kamers',
                roomsIntro: 'Selecteer een of meerdere kamers. Elke kaart toont de prijs voor jouw gekozen periode.',
                roomsMeta: '{available} van {total} kamers beschikbaar',
                roomCapacity: 'Maximaal {guests} gasten',
                roomAvailable: 'Beschikbaar',
                roomUnavailable: 'Niet beschikbaar',
                roomNightRate: 'Vanaf {price} per nacht',
                guestTitle: 'Jouw gegevens',
                guestIntro: 'Deze gegevens gebruiken we voor de reservering en de betaalstap.',
                nameLabel: 'Naam',
                namePlaceholder: 'Je volledige naam',
                emailLabel: 'E-mail',
                emailPlaceholder: 'jij@email.com',
                noteLabel: 'Opmerking',
                notePlaceholder: 'Bijvoorbeeld aankomsttijd of een praktische vraag',
                continueButton: 'Volgende: samenvatting en betalen',
                continueLoading: 'Reservering wordt vastgezet...',
                ctaNote: 'Na deze stap krijg je een samenvatting en een hold van 10 minuten voordat je betaalt.',
                summaryEyebrow: 'Stap 2',
                summaryTitle: 'Samenvatting',
                summaryIntro: 'Je ziet hier voortdurend wat er geboekt gaat worden en wat het totaalbedrag is.',
                summaryEmpty: 'Selecteer eerst je verblijfsperiode en minstens een kamer.',
                summaryStay: 'Verblijf',
                summaryRooms: 'Kamers',
                summaryGuests: 'Gast',
                summaryStayPrice: 'Verblijf',
                summaryExtras: 'Extra\'s',
                summaryTotal: 'Totaal',
                summaryHold: 'Na doorgaan blijft deze selectie 10 minuten voor je gereserveerd.',
                summaryNights: '{nights} nachten',
                calendarEyebrow: 'Overzicht',
                calendarTitle: 'Beschikbaarheid per kamer',
                calendarIntro: 'De kalender laat per kamer zien wat vrij, tijdelijk vastgezet of al geboekt is.',
                calendarLegendAvailable: 'Vrij',
                calendarLegendHeld: 'Tijdelijk vastgezet',
                calendarLegendBooked: 'Geboekt',
                availabilityEmpty: 'Kies eerst een datumrange om de kamers te laden.',
                availabilityLoading: 'Beschikbaarheid wordt geladen...',
                calendarLoading: 'Kalender wordt geladen...',
                validation: {
                    stayRequired: 'Kies eerst een geldige verblijfsperiode.',
                    roomsRequired: 'Selecteer minstens een beschikbare kamer.',
                    nameRequired: 'Vul je naam in.',
                    emailRequired: 'Vul je e-mailadres in.',
                    emailInvalid: 'Gebruik een geldig e-mailadres.',
                    noteLong: 'Je opmerking mag maximaal 1000 tekens bevatten.'
                },
                errors: {
                    settings: 'Beschikbaarheid kon niet worden geladen.',
                    unavailable: 'Deze periode of kamerselectie is niet beschikbaar.',
                    generic: 'Er ging iets mis. Probeer het opnieuw.'
                }
            },
            payment: {
                eyebrow: 'Stap 3',
                title: 'Je reserveringsoverzicht',
                text: 'Je kamers zijn tijdelijk voor je vastgezet. Rond de betaling af voordat de timer afloopt.',
                summaryTitle: 'Jouw reservering',
                summaryIntro: 'Hier staan je kamers, data en totaalprijs rustig bij elkaar.',
                roomsLabel: 'Kamers',
                stayLabel: 'Periode',
                guestLabel: 'Gast',
                totalLabel: 'Totaal',
                backButton: 'Terug naar boeken',
                payNow: 'Betaal met Stripe',
                redirecting: 'Je wordt doorgestuurd naar Stripe...',
                holdExpired: 'Je reserveringstijd is voorbij. Je kunt nu niet meer betalen voor deze selectie, maar je gegevens staan klaar om opnieuw beschikbaarheid te kiezen.',
                expiredAction: 'Gegevens bekijken en opnieuw kiezen',
                noStripe: 'Stripe is nog niet geconfigureerd op deze omgeving.',
                countdownLabel: 'Hold verloopt over {time}'
            },
            paymentSuccess: {
                eyebrow: 'Betaling ontvangen',
                title: 'Je reservering is bevestigd',
                text: 'De betaling is geslaagd en je kamers zijn definitief geboekt.',
                referenceLabel: 'Referentie',
                totalLabel: 'Totaal betaald',
                roomsLabel: 'Kamers',
                statusPaid: 'Betaling bevestigd.',
                backHome: 'Terug naar reserveren',
                loading: 'Betaling wordt gecontroleerd...',
                error: 'De betaling kon niet worden bevestigd.'
            }
        },
        en: {
            meta: { booking: 'Casa Serra Larga | Book', payment: 'Casa Serra Larga | Pay', paymentSuccess: 'Casa Serra Larga | Confirmed', home: 'Casa Serra Larga | Welcome' },
            common: { brandSubtitle: 'Quiet retreat in Portugal', footerLink: 'View the welcome page', bookNow: 'Book now', close: 'Close' },
            home: { eyebrow: 'Casa Serra Larga', title: 'Slow mornings, quiet evenings and a stay with care', intro: 'Book a calm countryside stay with clear pricing, real availability and a direct payment flow.', primaryCta: 'Book your stay', secondaryCta: 'Go to booking', cardOneKicker: 'Style', cardOneTitle: 'Warm, soft and intimate', cardOneText: 'A boutique-feeling stay with a clear online flow.', cardTwoKicker: 'Calm', cardTwoTitle: 'Every room visible separately', cardTwoText: 'You see straight away which room is still free for your dates.', cardThreeKicker: 'Practical', cardThreeTitle: 'Book and pay directly', cardThreeText: 'Choose rooms, review your total and complete payment with Stripe.' },
            booking: {
                eyebrow: 'Book directly, without guesswork', heroTitle: 'Choose your rooms, see the correct price instantly and hold your stay for 10 minutes', heroText: 'Each room has its own availability, occupancy and pricing rules. You select exactly what you want to book.', availabilityEyebrow: 'Step 1', availabilityTitle: 'Select dates and rooms', availabilityIntro: 'Choose your stay first. We then show each room, whether it is available and the exact total for your dates.', stayRangeLabel: 'From - to', stayRangePlaceholder: 'Choose your stay dates', extraBedLabel: 'Extra child bed', extraBedNote: 'EUR 15 per night per room', roomsTitle: 'Available rooms', roomsIntro: 'Select one or more rooms. Each card shows the price for your chosen stay.', roomsMeta: '{available} of {total} rooms available', roomCapacity: 'Up to {guests} guests', roomAvailable: 'Available', roomUnavailable: 'Unavailable', roomNightRate: 'From {price} per night', guestTitle: 'Your details', guestIntro: 'We use these details for the reservation and payment step.', nameLabel: 'Name', namePlaceholder: 'Your full name', emailLabel: 'Email', emailPlaceholder: 'you@email.com', noteLabel: 'Note', notePlaceholder: 'For example your arrival time or a practical question', continueButton: 'Next: summary and payment', continueLoading: 'Holding your reservation...', ctaNote: 'After this step you get a full summary and a 10-minute hold before payment.', summaryEyebrow: 'Step 2', summaryTitle: 'Summary', summaryIntro: 'This panel always shows what will be booked and the full amount.', summaryEmpty: 'Select your stay dates and at least one room first.', summaryStay: 'Stay', summaryRooms: 'Rooms', summaryGuests: 'Guest', summaryStayPrice: 'Stay', summaryExtras: 'Extras', summaryTotal: 'Total', summaryHold: 'After continuing, this selection is reserved for you for 10 minutes.', summaryNights: '{nights} nights', calendarEyebrow: 'Overview', calendarTitle: 'Availability by room', calendarIntro: 'The calendar shows which rooms are free, temporarily held or already booked.', calendarLegendAvailable: 'Free', calendarLegendHeld: 'Temporarily held', calendarLegendBooked: 'Booked', availabilityEmpty: 'Choose a date range to load the rooms.', availabilityLoading: 'Loading availability...', calendarLoading: 'Loading calendar...', validation: { stayRequired: 'Choose a valid stay period first.', roomsRequired: 'Select at least one available room.', nameRequired: 'Enter your name.', emailRequired: 'Enter your email address.', emailInvalid: 'Use a valid email address.', noteLong: 'Your note may contain at most 1000 characters.' }, errors: { settings: 'Availability could not be loaded.', unavailable: 'This period or room selection is unavailable.', generic: 'Something went wrong. Please try again.' } },
            payment: { eyebrow: 'Step 3', title: 'Your reservation overview', text: 'Your rooms are temporarily held for you. Complete payment before the timer ends.', summaryTitle: 'Your reservation', summaryIntro: 'Your rooms, dates and total are listed here in one place.', roomsLabel: 'Rooms', stayLabel: 'Period', guestLabel: 'Guest', totalLabel: 'Total', backButton: 'Back to booking', payNow: 'Pay with Stripe', redirecting: 'Redirecting you to Stripe...', holdExpired: 'Your reservation time has passed. You can no longer pay for this selection, but your details are ready so you can choose availability again.', expiredAction: 'Review details and choose again', noStripe: 'Stripe is not configured in this environment yet.', countdownLabel: 'Reservation expires in {time}' },
            paymentSuccess: { eyebrow: 'Payment received', title: 'Your reservation is confirmed', text: 'Payment succeeded and your rooms are now fully booked.', referenceLabel: 'Reference', totalLabel: 'Total paid', roomsLabel: 'Rooms', statusPaid: 'Payment confirmed.', backHome: 'Back to booking', loading: 'Verifying payment...', error: 'The payment could not be confirmed.' }
        },
        pt: {
            meta: { booking: 'Casa Serra Larga | Reservar', payment: 'Casa Serra Larga | Pagar', paymentSuccess: 'Casa Serra Larga | Confirmado', home: 'Casa Serra Larga | Bem-vindo' },
            common: { brandSubtitle: 'Retiro tranquilo em Portugal', footerLink: 'Ver a pagina de boas-vindas', bookNow: 'Reservar agora', close: 'Fechar' },
            home: { eyebrow: 'Casa Serra Larga', title: 'Manhas lentas, noites calmas e uma estadia com cuidado', intro: 'Reserve uma estadia serena com precos claros, disponibilidade real e pagamento direto.', primaryCta: 'Reservar estadia', secondaryCta: 'Ir para reservas', cardOneKicker: 'Estilo', cardOneTitle: 'Quente, suave e intimista', cardOneText: 'Uma estadia com ambiente boutique e fluxo online claro.', cardTwoKicker: 'Calma', cardTwoTitle: 'Cada quarto visivel em separado', cardTwoText: 'Vê logo qual quarto ainda esta livre nas suas datas.', cardThreeKicker: 'Pratico', cardThreeTitle: 'Reservar e pagar diretamente', cardThreeText: 'Escolha quartos, reveja o total e finalize com Stripe.' },
            booking: {
                eyebrow: 'Reserve diretamente, sem adivinhar', heroTitle: 'Escolha os seus quartos, veja o preco certo e bloqueie a estadia por 10 minutos', heroText: 'Cada quarto tem a sua propria disponibilidade, lotacao e regras de preco.', availabilityEyebrow: 'Passo 1', availabilityTitle: 'Escolha datas e quartos', availabilityIntro: 'Escolha primeiro a estadia. Depois mostramos cada quarto, se esta disponivel e o total exato.', stayRangeLabel: 'De - ate', stayRangePlaceholder: 'Escolha as datas da estadia', extraBedLabel: 'Cama extra para crianca', extraBedNote: 'EUR 15 por noite por quarto', roomsTitle: 'Quartos disponiveis', roomsIntro: 'Selecione um ou varios quartos. Cada cartao mostra o preco para a sua estadia.', roomsMeta: '{available} de {total} quartos disponiveis', roomCapacity: 'Ate {guests} hospedes', roomAvailable: 'Disponivel', roomUnavailable: 'Indisponivel', roomNightRate: 'Desde {price} por noite', guestTitle: 'Os seus dados', guestIntro: 'Usamos estes dados para a reserva e para o pagamento.', nameLabel: 'Nome', namePlaceholder: 'O seu nome completo', emailLabel: 'Email', emailPlaceholder: 'voce@email.com', noteLabel: 'Nota', notePlaceholder: 'Por exemplo hora de chegada ou uma pergunta pratica', continueButton: 'Seguinte: resumo e pagamento', continueLoading: 'A bloquear a sua reserva...', ctaNote: 'Depois deste passo recebe um resumo completo e um hold de 10 minutos antes do pagamento.', summaryEyebrow: 'Passo 2', summaryTitle: 'Resumo', summaryIntro: 'Aqui ve sempre o que vai ser reservado e o valor total.', summaryEmpty: 'Escolha primeiro as datas e pelo menos um quarto.', summaryStay: 'Estadia', summaryRooms: 'Quartos', summaryGuests: 'Hospede', summaryStayPrice: 'Estadia', summaryExtras: 'Extras', summaryTotal: 'Total', summaryHold: 'Depois de continuar, esta selecao fica reservada para si durante 10 minutos.', summaryNights: '{nights} noites', calendarEyebrow: 'Visao geral', calendarTitle: 'Disponibilidade por quarto', calendarIntro: 'O calendario mostra o que esta livre, temporariamente bloqueado ou ja reservado.', calendarLegendAvailable: 'Livre', calendarLegendHeld: 'Temporariamente bloqueado', calendarLegendBooked: 'Reservado', availabilityEmpty: 'Escolha um intervalo de datas para carregar os quartos.', availabilityLoading: 'A carregar disponibilidade...', calendarLoading: 'A carregar calendario...', validation: { stayRequired: 'Escolha primeiro um periodo valido.', roomsRequired: 'Selecione pelo menos um quarto disponivel.', nameRequired: 'Introduza o seu nome.', emailRequired: 'Introduza o seu email.', emailInvalid: 'Use um email valido.', noteLong: 'A nota pode ter no maximo 1000 caracteres.' }, errors: { settings: 'Nao foi possivel carregar a disponibilidade.', unavailable: 'Este periodo ou selecao de quartos nao esta disponivel.', generic: 'Algo correu mal. Tente novamente.' } },
            payment: { eyebrow: 'Passo 3', title: 'Resumo da sua reserva', text: 'Os seus quartos estao temporariamente reservados para si. Conclua o pagamento antes do fim do tempo.', summaryTitle: 'A sua reserva', summaryIntro: 'Os quartos, datas e total estao aqui reunidos com clareza.', roomsLabel: 'Quartos', stayLabel: 'Periodo', guestLabel: 'Hospede', totalLabel: 'Total', backButton: 'Voltar para reservas', payNow: 'Pagar com Stripe', redirecting: 'A redirecionar para Stripe...', holdExpired: 'O tempo da sua reserva passou. Ja nao e possivel pagar esta selecao, mas os seus dados estao prontos para escolher disponibilidade novamente.', expiredAction: 'Ver dados e escolher novamente', noStripe: 'Stripe ainda nao esta configurado neste ambiente.', countdownLabel: 'Reserva expira em {time}' },
            paymentSuccess: { eyebrow: 'Pagamento recebido', title: 'A sua reserva esta confirmada', text: 'O pagamento foi concluido e os seus quartos ficaram reservados.', referenceLabel: 'Referencia', totalLabel: 'Total pago', roomsLabel: 'Quartos', statusPaid: 'Pagamento confirmado.', backHome: 'Voltar para reservas', loading: 'A confirmar pagamento...', error: 'Nao foi possivel confirmar o pagamento.' }
        },
        es: {
            meta: { booking: 'Casa Serra Larga | Reservar', payment: 'Casa Serra Larga | Pagar', paymentSuccess: 'Casa Serra Larga | Confirmado', home: 'Casa Serra Larga | Bienvenido' },
            common: { brandSubtitle: 'Retiro tranquilo en Portugal', footerLink: 'Ver la pagina de bienvenida', bookNow: 'Reservar ahora', close: 'Cerrar' },
            home: { eyebrow: 'Casa Serra Larga', title: 'Mananas lentas, noches tranquilas y una estancia con cuidado', intro: 'Reserva una estancia serena con precios claros, disponibilidad real y pago directo.', primaryCta: 'Reservar estancia', secondaryCta: 'Ir a reservas', cardOneKicker: 'Estilo', cardOneTitle: 'Calido, suave e intimo', cardOneText: 'Una estancia con ambiente boutique y flujo online claro.', cardTwoKicker: 'Calma', cardTwoTitle: 'Cada habitacion visible por separado', cardTwoText: 'Ves enseguida que habitacion sigue libre para tus fechas.', cardThreeKicker: 'Practico', cardThreeTitle: 'Reservar y pagar directamente', cardThreeText: 'Elige habitaciones, revisa el total y termina con Stripe.' },
            booking: {
                eyebrow: 'Reserva directamente, sin adivinar', heroTitle: 'Elige tus habitaciones, ve el precio correcto al instante y bloquea la estancia durante 10 minutos', heroText: 'Cada habitacion tiene su propia disponibilidad, ocupacion y reglas de precio.', availabilityEyebrow: 'Paso 1', availabilityTitle: 'Selecciona fechas y habitaciones', availabilityIntro: 'Elige primero tu estancia. Luego mostramos cada habitacion, si esta disponible y el total exacto.', stayRangeLabel: 'Desde - hasta', stayRangePlaceholder: 'Elige las fechas de tu estancia', extraBedLabel: 'Cama extra para nino', extraBedNote: 'EUR 15 por noche por habitacion', roomsTitle: 'Habitaciones disponibles', roomsIntro: 'Selecciona una o varias habitaciones. Cada tarjeta muestra el precio de tu estancia.', roomsMeta: '{available} de {total} habitaciones disponibles', roomCapacity: 'Hasta {guests} huespedes', roomAvailable: 'Disponible', roomUnavailable: 'No disponible', roomNightRate: 'Desde {price} por noche', guestTitle: 'Tus datos', guestIntro: 'Usamos estos datos para la reserva y el pago.', nameLabel: 'Nombre', namePlaceholder: 'Tu nombre completo', emailLabel: 'Correo electronico', emailPlaceholder: 'tu@email.com', noteLabel: 'Nota', notePlaceholder: 'Por ejemplo hora de llegada o una pregunta practica', continueButton: 'Siguiente: resumen y pago', continueLoading: 'Bloqueando tu reserva...', ctaNote: 'Despues de este paso recibes un resumen completo y un hold de 10 minutos antes del pago.', summaryEyebrow: 'Paso 2', summaryTitle: 'Resumen', summaryIntro: 'Aqui ves siempre lo que se va a reservar y el importe total.', summaryEmpty: 'Selecciona primero tus fechas y al menos una habitacion.', summaryStay: 'Estancia', summaryRooms: 'Habitaciones', summaryGuests: 'Huesped', summaryStayPrice: 'Estancia', summaryExtras: 'Extras', summaryTotal: 'Total', summaryHold: 'Despues de continuar, esta seleccion queda reservada para ti durante 10 minutos.', summaryNights: '{nights} noches', calendarEyebrow: 'Vista general', calendarTitle: 'Disponibilidad por habitacion', calendarIntro: 'El calendario muestra que esta libre, retenido temporalmente o ya reservado.', calendarLegendAvailable: 'Libre', calendarLegendHeld: 'Retenido', calendarLegendBooked: 'Reservado', availabilityEmpty: 'Elige un rango de fechas para cargar las habitaciones.', availabilityLoading: 'Cargando disponibilidad...', calendarLoading: 'Cargando calendario...', validation: { stayRequired: 'Elige primero un periodo valido.', roomsRequired: 'Selecciona al menos una habitacion disponible.', nameRequired: 'Introduce tu nombre.', emailRequired: 'Introduce tu correo electronico.', emailInvalid: 'Usa un correo electronico valido.', noteLong: 'La nota puede tener como maximo 1000 caracteres.' }, errors: { settings: 'No se pudo cargar la disponibilidad.', unavailable: 'Este periodo o seleccion no esta disponible.', generic: 'Algo salio mal. Intentalo de nuevo.' } },
            payment: { eyebrow: 'Paso 3', title: 'Resumen de tu reserva', text: 'Tus habitaciones estan retenidas temporalmente para ti. Completa el pago antes de que termine el tiempo.', summaryTitle: 'Tu reserva', summaryIntro: 'Tus habitaciones, fechas y total estan reunidos aqui con claridad.', roomsLabel: 'Habitaciones', stayLabel: 'Periodo', guestLabel: 'Huesped', totalLabel: 'Total', backButton: 'Volver a reservar', payNow: 'Pagar con Stripe', redirecting: 'Redirigiendo a Stripe...', holdExpired: 'El tiempo de tu reserva ha terminado. Ya no puedes pagar esta seleccion, pero tus datos estan listos para elegir disponibilidad de nuevo.', expiredAction: 'Ver datos y elegir de nuevo', noStripe: 'Stripe todavia no esta configurado en este entorno.', countdownLabel: 'La reserva vence en {time}' },
            paymentSuccess: { eyebrow: 'Pago recibido', title: 'Tu reserva esta confirmada', text: 'El pago fue correcto y tus habitaciones ya estan reservadas.', referenceLabel: 'Referencia', totalLabel: 'Total pagado', roomsLabel: 'Habitaciones', statusPaid: 'Pago confirmado.', backHome: 'Volver a reservar', loading: 'Verificando pago...', error: 'No se pudo confirmar el pago.' }
        },
        fr: {
            meta: { booking: 'Casa Serra Larga | Reserver', payment: 'Casa Serra Larga | Paiement', paymentSuccess: 'Casa Serra Larga | Confirme', home: 'Casa Serra Larga | Bienvenue' },
            common: { brandSubtitle: 'Retraite paisible au Portugal', footerLink: 'Voir la page d accueil', bookNow: 'Reserver', close: 'Fermer' },
            home: { eyebrow: 'Casa Serra Larga', title: 'Matins lents, soirs calmes et un sejour soigne', intro: 'Reservez un sejour paisible avec des prix clairs, une vraie disponibilite et un paiement direct.', primaryCta: 'Reserver le sejour', secondaryCta: 'Aller a la reservation', cardOneKicker: 'Style', cardOneTitle: 'Chaleureux, doux et intime', cardOneText: 'Un sejour au style boutique avec un parcours en ligne clair.', cardTwoKicker: 'Calme', cardTwoTitle: 'Chaque chambre visible separement', cardTwoText: 'Vous voyez tout de suite quelle chambre est encore libre.', cardThreeKicker: 'Pratique', cardThreeTitle: 'Reserver et payer directement', cardThreeText: 'Choisissez les chambres, verifiez le total et terminez avec Stripe.' },
            booking: {
                eyebrow: 'Reservez directement, sans approximation', heroTitle: 'Choisissez vos chambres, voyez le bon prix et bloquez votre sejour pendant 10 minutes', heroText: 'Chaque chambre a sa propre disponibilite, capacite et regles de prix.', availabilityEyebrow: 'Etape 1', availabilityTitle: 'Choisissez dates et chambres', availabilityIntro: 'Choisissez d abord votre sejour. Ensuite nous affichons chaque chambre, sa disponibilite et le total exact.', stayRangeLabel: 'Du - au', stayRangePlaceholder: 'Choisissez vos dates', extraBedLabel: 'Lit enfant supplementaire', extraBedNote: 'EUR 15 par nuit et par chambre', roomsTitle: 'Chambres disponibles', roomsIntro: 'Selectionnez une ou plusieurs chambres. Chaque carte montre le prix pour votre sejour.', roomsMeta: '{available} chambres disponibles sur {total}', roomCapacity: 'Jusqu a {guests} personnes', roomAvailable: 'Disponible', roomUnavailable: 'Indisponible', roomNightRate: 'A partir de {price} par nuit', guestTitle: 'Vos coordonnees', guestIntro: 'Nous utilisons ces donnees pour la reservation et le paiement.', nameLabel: 'Nom', namePlaceholder: 'Votre nom complet', emailLabel: 'Email', emailPlaceholder: 'vous@email.com', noteLabel: 'Note', notePlaceholder: 'Par exemple heure d arrivee ou question pratique', continueButton: 'Suivant : resume et paiement', continueLoading: 'Reservation en cours de blocage...', ctaNote: 'Apres cette etape, vous obtenez un resume complet et un blocage de 10 minutes avant paiement.', summaryEyebrow: 'Etape 2', summaryTitle: 'Resume', summaryIntro: 'Ce panneau montre en permanence ce qui sera reserve et le montant total.', summaryEmpty: 'Choisissez d abord vos dates et au moins une chambre.', summaryStay: 'Sejour', summaryRooms: 'Chambres', summaryGuests: 'Client', summaryStayPrice: 'Sejour', summaryExtras: 'Extras', summaryTotal: 'Total', summaryHold: 'Apres avoir continue, cette selection vous est reservee pendant 10 minutes.', summaryNights: '{nights} nuits', calendarEyebrow: 'Vue generale', calendarTitle: 'Disponibilite par chambre', calendarIntro: 'Le calendrier montre ce qui est libre, temporairement bloque ou deja reserve.', calendarLegendAvailable: 'Libre', calendarLegendHeld: 'Temporairement bloque', calendarLegendBooked: 'Reserve', availabilityEmpty: 'Choisissez une plage de dates pour charger les chambres.', availabilityLoading: 'Chargement des disponibilites...', calendarLoading: 'Chargement du calendrier...', validation: { stayRequired: 'Choisissez d abord une periode valide.', roomsRequired: 'Selectionnez au moins une chambre disponible.', nameRequired: 'Saisissez votre nom.', emailRequired: 'Saisissez votre email.', emailInvalid: 'Utilisez une adresse email valide.', noteLong: 'La note peut contenir au maximum 1000 caracteres.' }, errors: { settings: 'La disponibilite n a pas pu etre chargee.', unavailable: 'Cette periode ou selection n est pas disponible.', generic: 'Une erreur est survenue. Reessayez.' } },
            payment: { eyebrow: 'Etape 3', title: 'Apercu de votre reservation', text: 'Vos chambres sont temporairement reservees pour vous. Finalisez le paiement avant la fin du delai.', summaryTitle: 'Votre reservation', summaryIntro: 'Vos chambres, dates et total sont rassembles ici clairement.', roomsLabel: 'Chambres', stayLabel: 'Periode', guestLabel: 'Client', totalLabel: 'Total', backButton: 'Retour a la reservation', payNow: 'Payer avec Stripe', redirecting: 'Redirection vers Stripe...', holdExpired: 'Le delai de votre reservation est termine. Vous ne pouvez plus payer cette selection, mais vos informations sont pretes pour choisir de nouveau.', expiredAction: 'Voir les informations et choisir de nouveau', noStripe: 'Stripe n est pas encore configure dans cet environnement.', countdownLabel: 'La reservation expire dans {time}' },
            paymentSuccess: { eyebrow: 'Paiement recu', title: 'Votre reservation est confirmee', text: 'Le paiement a reussi et vos chambres sont desormais reservees.', referenceLabel: 'Reference', totalLabel: 'Total paye', roomsLabel: 'Chambres', statusPaid: 'Paiement confirme.', backHome: 'Retour a la reservation', loading: 'Verification du paiement...', error: 'Le paiement n a pas pu etre confirme.' }
        },
        de: {
            meta: { booking: 'Casa Serra Larga | Buchen', payment: 'Casa Serra Larga | Zahlung', paymentSuccess: 'Casa Serra Larga | Bestaetigt', home: 'Casa Serra Larga | Willkommen' },
            common: { brandSubtitle: 'Ruhiger Rueckzugsort in Portugal', footerLink: 'Zur Willkommensseite', bookNow: 'Jetzt buchen', close: 'Schliessen' },
            home: { eyebrow: 'Casa Serra Larga', title: 'Langsame Morgen, ruhige Abende und ein Aufenthalt mit Sorgfalt', intro: 'Buchen Sie einen ruhigen Aufenthalt mit klaren Preisen, echter Verfuegbarkeit und direkter Zahlung.', primaryCta: 'Aufenthalt buchen', secondaryCta: 'Zur Buchung', cardOneKicker: 'Stil', cardOneTitle: 'Warm, weich und intim', cardOneText: 'Ein Aufenthalt mit Boutique-Gefuehl und klarem Online-Ablauf.', cardTwoKicker: 'Ruhe', cardTwoTitle: 'Jedes Zimmer einzeln sichtbar', cardTwoText: 'Sie sehen sofort, welches Zimmer noch frei ist.', cardThreeKicker: 'Praktisch', cardThreeTitle: 'Direkt buchen und bezahlen', cardThreeText: 'Waehlen Sie Zimmer, pruefen Sie den Gesamtbetrag und bezahlen Sie mit Stripe.' },
            booking: {
                eyebrow: 'Direkt buchen, ohne Raten', heroTitle: 'Waehlen Sie Ihre Zimmer, sehen Sie sofort den richtigen Preis und halten Sie Ihren Aufenthalt 10 Minuten fest', heroText: 'Jedes Zimmer hat seine eigene Verfuegbarkeit, Belegung und Preislogik.', availabilityEyebrow: 'Schritt 1', availabilityTitle: 'Daten und Zimmer waehlen', availabilityIntro: 'Waehlen Sie zuerst Ihren Aufenthalt. Danach zeigen wir jedes Zimmer, seine Verfuegbarkeit und den exakten Gesamtpreis.', stayRangeLabel: 'Von - bis', stayRangePlaceholder: 'Aufenthaltsdaten waehlen', extraBedLabel: 'Zusaetzliches Kinderbett', extraBedNote: 'EUR 15 pro Nacht und Zimmer', roomsTitle: 'Verfuegbare Zimmer', roomsIntro: 'Waehlen Sie ein oder mehrere Zimmer. Jede Karte zeigt den Preis fuer Ihren Zeitraum.', roomsMeta: '{available} von {total} Zimmern verfuegbar', roomCapacity: 'Bis zu {guests} Gaeste', roomAvailable: 'Verfuegbar', roomUnavailable: 'Nicht verfuegbar', roomNightRate: 'Ab {price} pro Nacht', guestTitle: 'Ihre Daten', guestIntro: 'Diese Daten werden fuer Reservierung und Zahlung verwendet.', nameLabel: 'Name', namePlaceholder: 'Ihr vollstaendiger Name', emailLabel: 'E-Mail', emailPlaceholder: 'sie@email.com', noteLabel: 'Notiz', notePlaceholder: 'Zum Beispiel Ankunftszeit oder praktische Frage', continueButton: 'Weiter: Zusammenfassung und Zahlung', continueLoading: 'Reservierung wird gehalten...', ctaNote: 'Nach diesem Schritt erhalten Sie eine Zusammenfassung und eine 10-Minuten-Reservierung vor der Zahlung.', summaryEyebrow: 'Schritt 2', summaryTitle: 'Zusammenfassung', summaryIntro: 'Hier sehen Sie jederzeit, was gebucht wird und wie hoch der Gesamtbetrag ist.', summaryEmpty: 'Waehlen Sie zuerst Daten und mindestens ein Zimmer.', summaryStay: 'Aufenthalt', summaryRooms: 'Zimmer', summaryGuests: 'Gast', summaryStayPrice: 'Aufenthalt', summaryExtras: 'Extras', summaryTotal: 'Gesamt', summaryHold: 'Nach dem Fortfahren ist diese Auswahl 10 Minuten fuer Sie reserviert.', summaryNights: '{nights} Naechte', calendarEyebrow: 'Uebersicht', calendarTitle: 'Verfuegbarkeit pro Zimmer', calendarIntro: 'Der Kalender zeigt freie, temporaer reservierte und bereits gebuchte Zimmer.', calendarLegendAvailable: 'Frei', calendarLegendHeld: 'Temporaer gehalten', calendarLegendBooked: 'Gebucht', availabilityEmpty: 'Waehlen Sie einen Datumsbereich, um Zimmer zu laden.', availabilityLoading: 'Verfuegbarkeit wird geladen...', calendarLoading: 'Kalender wird geladen...', validation: { stayRequired: 'Waehlen Sie zuerst einen gueltigen Zeitraum.', roomsRequired: 'Waehlen Sie mindestens ein verfuegbares Zimmer.', nameRequired: 'Geben Sie Ihren Namen ein.', emailRequired: 'Geben Sie Ihre E-Mail-Adresse ein.', emailInvalid: 'Verwenden Sie eine gueltige E-Mail-Adresse.', noteLong: 'Die Notiz darf hoechstens 1000 Zeichen enthalten.' }, errors: { settings: 'Die Verfuegbarkeit konnte nicht geladen werden.', unavailable: 'Dieser Zeitraum oder diese Auswahl ist nicht verfuegbar.', generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.' } },
            payment: { eyebrow: 'Schritt 3', title: 'Ihre Reservierungsuebersicht', text: 'Ihre Zimmer sind temporaer fuer Sie reserviert. Schliessen Sie die Zahlung ab, bevor der Timer endet.', summaryTitle: 'Ihre Reservierung', summaryIntro: 'Zimmer, Daten und Gesamtbetrag stehen hier uebersichtlich zusammen.', roomsLabel: 'Zimmer', stayLabel: 'Zeitraum', guestLabel: 'Gast', totalLabel: 'Gesamt', backButton: 'Zurueck zur Buchung', payNow: 'Mit Stripe bezahlen', redirecting: 'Weiterleitung zu Stripe...', holdExpired: 'Ihre Reservierungszeit ist vorbei. Diese Auswahl kann nicht mehr bezahlt werden, aber Ihre Daten sind bereit, um erneut Verfuegbarkeit zu waehlen.', expiredAction: 'Daten ansehen und erneut waehlen', noStripe: 'Stripe ist in dieser Umgebung noch nicht konfiguriert.', countdownLabel: 'Reservierung laeuft ab in {time}' },
            paymentSuccess: { eyebrow: 'Zahlung erhalten', title: 'Ihre Reservierung ist bestaetigt', text: 'Die Zahlung war erfolgreich und Ihre Zimmer sind jetzt fest gebucht.', referenceLabel: 'Referenz', totalLabel: 'Bezahlt', roomsLabel: 'Zimmer', statusPaid: 'Zahlung bestaetigt.', backHome: 'Zurueck zur Buchung', loading: 'Zahlung wird geprueft...', error: 'Die Zahlung konnte nicht bestaetigt werden.' }
        }
    };

    const bookingOverrides = {
        nl: {
            availabilityTitle: 'Selecteer data, extra\'s en kamers',
            availabilityIntro: 'Kies eerst je verblijfsperiode. Daarna zie je per kamer direct of ze beschikbaar is en wat het exacte totaal wordt.',
            continueButton: 'Volgende',
            adultCountLabel: 'Aantal volwassenen',
            childCountLabel: 'Aantal kinderen t/m 12 jaar',
            babyCountLabel: 'Aantal baby\'s',
            babyBedLabel: 'Babybedje',
            babyBedNote: 'Gratis',
            summaryGuestCounts: '{adults} volwassenen, {children} kinderen, {babies} baby\'s',
            calendarMonthSelectLabel: 'Kies maand',
            calendarYearSelectLabel: 'Kies jaar',
            calendarTodayButton: 'Deze maand',
            guestIntro: 'Deze gegevens gebruiken we voor de reservering en de betaalstap.',
            phoneLabel: 'Telefoonnummer',
            phonePlaceholder: '+31 6 12345678',
            nifNumberLabel: 'NIF-nummer',
            nifNumberPlaceholder: '123456789',
            addressTitle: 'Adresgegevens',
            addressIntro: 'Gebruik het adres van de hoofdboeker.',
            streetLabel: 'Straat',
            streetPlaceholder: 'Straatnaam',
            houseNumberLabel: 'Huisnummer',
            houseNumberPlaceholder: '12A',
            postalCodeLabel: 'Postcode',
            postalCodePlaceholder: '1234 AB',
            cityLabel: 'Plaats',
            cityPlaceholder: 'Amsterdam',
            countryLabel: 'Land',
            countryPlaceholder: 'Nederland',
            summaryTitle: 'Samenvatting',
            summaryIntro: 'Je ziet hier direct je gekozen kamers en het totale bedrag.',
            summaryStayPrice: 'Verblijf excl. btw',
            summarySubtotal: 'Totaal excl. btw',
            summaryExtras: 'Extra\'s excl. btw',
            summaryVat: 'Btw 6%',
            summaryTotal: 'Totaal incl. btw',
            summaryRateDetail: '{nightsLabel} x {price}',
            summaryExtraBedTitle: 'Extra kinderbed',
            summarySingleOccupancyDiscountTitle: 'Korting 1 persoon {room}',
            validation: {
                phoneRequired: 'Vul je telefoonnummer in.',
                phoneInvalid: 'Gebruik een geldig telefoonnummer.',
                nifNumberLong: 'Het NIF-nummer mag maximaal 32 tekens bevatten.',
                streetRequired: 'Vul je straat in.',
                houseNumberRequired: 'Vul je huisnummer in.',
                postalCodeRequired: 'Vul je postcode in.',
                cityRequired: 'Vul je woonplaats in.',
                countryRequired: 'Vul je land in.',
                noteLong: 'Je opmerking mag maximaal 1000 tekens bevatten.',
                adultCountRequired: 'Vul minimaal 1 volwassene in.',
                extraBedNeedsChild: 'Extra kinderbedden kunnen alleen voor kinderen worden gebruikt.',
                babyBedNeedsBaby: 'Babybedjes kunnen alleen voor baby\'s worden gebruikt.',
                extraBedPerRoom: 'Er past maximaal 1 extra kinderbed per kamer.',
                babyBedPerRoom: 'Er past maximaal 1 babybedje per kamer.',
                occupancyRoomsRequired: 'Selecteer meer kamers of voeg een extra kinderbed toe voor dit aantal gasten.'
            }
        },
        en: {
            availabilityTitle: 'Select dates, extras and rooms',
            availabilityIntro: 'Choose your stay first. Then you immediately see per room whether it is available and what the exact total is.',
            continueButton: 'Next',
            adultCountLabel: 'Number of adults',
            childCountLabel: 'Number of children up to 12',
            babyCountLabel: 'Number of babies',
            babyBedLabel: 'Baby cot',
            babyBedNote: 'Free of charge',
            summaryGuestCounts: '{adults} adults, {children} children, {babies} babies',
            calendarMonthSelectLabel: 'Choose month',
            calendarYearSelectLabel: 'Choose year',
            calendarTodayButton: 'This month',
            guestIntro: 'We use these details for the reservation and payment step.',
            phoneLabel: 'Phone number',
            phonePlaceholder: '+44 7700 900123',
            addressTitle: 'Address details',
            addressIntro: 'Use the address of the main guest.',
            streetLabel: 'Street',
            streetPlaceholder: 'Street name',
            houseNumberLabel: 'House number',
            houseNumberPlaceholder: '12A',
            postalCodeLabel: 'Postal code',
            postalCodePlaceholder: 'SW1A 1AA',
            cityLabel: 'City',
            cityPlaceholder: 'London',
            countryLabel: 'Country',
            countryPlaceholder: 'United Kingdom',
            summaryTitle: 'Summary',
            summaryIntro: 'You immediately see your selected rooms and the full amount here.',
            summaryStayPrice: 'Stay excl. VAT',
            summarySubtotal: 'Total excl. VAT',
            summaryExtras: 'Extras excl. VAT',
            summaryVat: 'VAT 6%',
            summaryTotal: 'Total incl. VAT',
            summaryRateDetail: '{nightsLabel} x {price}',
            summaryExtraBedTitle: 'Extra child bed',
            summarySingleOccupancyDiscountTitle: 'Single guest discount {room}',
            validation: {
                phoneRequired: 'Enter your phone number.',
                phoneInvalid: 'Use a valid phone number.',
                streetRequired: 'Enter your street.',
                houseNumberRequired: 'Enter your house number.',
                postalCodeRequired: 'Enter your postal code.',
                cityRequired: 'Enter your city.',
                countryRequired: 'Enter your country.',
                adultCountRequired: 'Enter at least 1 adult.',
                extraBedNeedsChild: 'Extra child beds can only be used for children.',
                babyBedNeedsBaby: 'Baby cots can only be used for babies.',
                extraBedPerRoom: 'Only 1 extra child bed fits per room.',
                babyBedPerRoom: 'Only 1 baby cot fits per room.',
                occupancyRoomsRequired: 'Select more rooms or add an extra child bed for this number of guests.'
            }
        },
        pt: {
            availabilityTitle: 'Escolha datas, extras e quartos',
            availabilityIntro: 'Escolha primeiro a estadia. Depois ve logo por quarto se esta disponivel e qual e o total exato.',
            continueButton: 'Seguinte',
            adultCountLabel: 'Numero de adultos',
            childCountLabel: 'Numero de criancas ate 12 anos',
            babyCountLabel: 'Numero de bebes',
            babyBedLabel: 'Berco',
            babyBedNote: 'Gratis',
            summaryGuestCounts: '{adults} adultos, {children} criancas, {babies} bebes',
            calendarMonthSelectLabel: 'Escolha o mes',
            calendarYearSelectLabel: 'Escolha o ano',
            calendarTodayButton: 'Este mes',
            guestIntro: 'Usamos estes dados para a reserva e para o pagamento.',
            phoneLabel: 'Telefone',
            phonePlaceholder: '+351 912 345 678',
            nifNumberLabel: 'Numero de Identificacao Fiscal (NIF)',
            nifNumberPlaceholder: '123456789',
            addressTitle: 'Morada',
            addressIntro: 'Use a morada do hospede principal.',
            streetLabel: 'Rua',
            streetPlaceholder: 'Nome da rua',
            houseNumberLabel: 'Numero',
            houseNumberPlaceholder: '12A',
            postalCodeLabel: 'Codigo postal',
            postalCodePlaceholder: '1000-001',
            cityLabel: 'Cidade',
            cityPlaceholder: 'Lisboa',
            countryLabel: 'Pais',
            countryPlaceholder: 'Portugal',
            summaryTitle: 'Resumo',
            summaryIntro: 'Ve logo aqui os quartos escolhidos e o valor total.',
            summaryStayPrice: 'Estadia sem IVA',
            summarySubtotal: 'Total sem IVA',
            summaryExtras: 'Extras sem IVA',
            summaryVat: 'IVA 6%',
            summaryTotal: 'Total com IVA',
            summaryRateDetail: '{nightsLabel} x {price}',
            summaryExtraBedTitle: 'Cama extra para crianca',
            summarySingleOccupancyDiscountTitle: 'Desconto 1 pessoa {room}',
            validation: {
                phoneRequired: 'Introduza o seu telefone.',
                phoneInvalid: 'Use um numero de telefone valido.',
                nifNumberLong: 'O NIF pode ter no maximo 32 caracteres.',
                streetRequired: 'Introduza a rua.',
                houseNumberRequired: 'Introduza o numero.',
                postalCodeRequired: 'Introduza o codigo postal.',
                cityRequired: 'Introduza a cidade.',
                countryRequired: 'Introduza o pais.',
                adultCountRequired: 'Introduza pelo menos 1 adulto.',
                extraBedNeedsChild: 'As camas extra de crianca so podem ser usadas para criancas.',
                babyBedNeedsBaby: 'Os bercos so podem ser usados para bebes.',
                extraBedPerRoom: 'So cabe 1 cama extra de crianca por quarto.',
                babyBedPerRoom: 'So cabe 1 berco por quarto.',
                occupancyRoomsRequired: 'Selecione mais quartos ou adicione uma cama extra de crianca para este numero de hospedes.'
            }
        },
        es: {
            availabilityTitle: 'Selecciona fechas, extras y habitaciones',
            availabilityIntro: 'Elige primero la estancia. Luego ves enseguida por habitacion si esta disponible y cual es el total exacto.',
            continueButton: 'Siguiente',
            adultCountLabel: 'Numero de adultos',
            childCountLabel: 'Numero de ninos hasta 12 anos',
            babyCountLabel: 'Numero de bebes',
            babyBedLabel: 'Cuna',
            babyBedNote: 'Gratis',
            summaryGuestCounts: '{adults} adultos, {children} ninos, {babies} bebes',
            calendarMonthSelectLabel: 'Elige mes',
            calendarYearSelectLabel: 'Elige ano',
            calendarTodayButton: 'Este mes',
            guestIntro: 'Usamos estos datos para la reserva y el pago.',
            phoneLabel: 'Telefono',
            phonePlaceholder: '+34 612 34 56 78',
            addressTitle: 'Direccion',
            addressIntro: 'Usa la direccion del huesped principal.',
            streetLabel: 'Calle',
            streetPlaceholder: 'Nombre de la calle',
            houseNumberLabel: 'Numero',
            houseNumberPlaceholder: '12A',
            postalCodeLabel: 'Codigo postal',
            postalCodePlaceholder: '28001',
            cityLabel: 'Ciudad',
            cityPlaceholder: 'Madrid',
            countryLabel: 'Pais',
            countryPlaceholder: 'Espana',
            summaryTitle: 'Resumen',
            summaryIntro: 'Aqui ves enseguida las habitaciones elegidas y el importe total.',
            summaryStayPrice: 'Estancia sin IVA',
            summarySubtotal: 'Total sin IVA',
            summaryExtras: 'Extras sin IVA',
            summaryVat: 'IVA 6%',
            summaryTotal: 'Total con IVA',
            summaryRateDetail: '{nightsLabel} x {price}',
            summaryExtraBedTitle: 'Cama extra para nino',
            summarySingleOccupancyDiscountTitle: 'Descuento 1 persona {room}',
            validation: {
                phoneRequired: 'Introduce tu telefono.',
                phoneInvalid: 'Usa un telefono valido.',
                streetRequired: 'Introduce tu calle.',
                houseNumberRequired: 'Introduce tu numero.',
                postalCodeRequired: 'Introduce tu codigo postal.',
                cityRequired: 'Introduce tu ciudad.',
                countryRequired: 'Introduce tu pais.',
                adultCountRequired: 'Introduce al menos 1 adulto.',
                extraBedNeedsChild: 'Las camas extra infantiles solo pueden usarse para ninos.',
                babyBedNeedsBaby: 'Las cunas solo pueden usarse para bebes.',
                extraBedPerRoom: 'Solo cabe 1 cama extra infantil por habitacion.',
                babyBedPerRoom: 'Solo cabe 1 cuna por habitacion.',
                occupancyRoomsRequired: 'Selecciona mas habitaciones o anade una cama extra infantil para este numero de huespedes.'
            }
        },
        fr: {
            availabilityTitle: 'Choisissez dates, extras et chambres',
            availabilityIntro: 'Choisissez d abord votre sejour. Ensuite vous voyez tout de suite par chambre si elle est disponible et le total exact.',
            continueButton: 'Suivant',
            adultCountLabel: 'Nombre d adultes',
            childCountLabel: 'Nombre d enfants jusqu a 12 ans',
            babyCountLabel: 'Nombre de bebes',
            babyBedLabel: 'Lit bebe',
            babyBedNote: 'Gratuit',
            summaryGuestCounts: '{adults} adultes, {children} enfants, {babies} bebes',
            calendarMonthSelectLabel: 'Choisir le mois',
            calendarYearSelectLabel: 'Choisir l annee',
            calendarTodayButton: 'Ce mois-ci',
            guestIntro: 'Nous utilisons ces donnees pour la reservation et le paiement.',
            phoneLabel: 'Telephone',
            phonePlaceholder: '+33 6 12 34 56 78',
            addressTitle: 'Adresse',
            addressIntro: 'Utilisez l adresse du client principal.',
            streetLabel: 'Rue',
            streetPlaceholder: 'Nom de la rue',
            houseNumberLabel: 'Numero',
            houseNumberPlaceholder: '12A',
            postalCodeLabel: 'Code postal',
            postalCodePlaceholder: '75001',
            cityLabel: 'Ville',
            cityPlaceholder: 'Paris',
            countryLabel: 'Pays',
            countryPlaceholder: 'France',
            summaryTitle: 'Resume',
            summaryIntro: 'Vous voyez ici tout de suite les chambres choisies et le montant total.',
            summaryStayPrice: 'Sejour hors TVA',
            summarySubtotal: 'Total hors TVA',
            summaryExtras: 'Extras hors TVA',
            summaryVat: 'TVA 6%',
            summaryTotal: 'Total TTC',
            summaryRateDetail: '{nightsLabel} x {price}',
            summaryExtraBedTitle: 'Lit enfant supplementaire',
            summarySingleOccupancyDiscountTitle: 'Remise 1 personne {room}',
            validation: {
                phoneRequired: 'Saisissez votre telephone.',
                phoneInvalid: 'Utilisez un numero de telephone valide.',
                streetRequired: 'Saisissez votre rue.',
                houseNumberRequired: 'Saisissez votre numero.',
                postalCodeRequired: 'Saisissez votre code postal.',
                cityRequired: 'Saisissez votre ville.',
                countryRequired: 'Saisissez votre pays.',
                adultCountRequired: 'Saisissez au moins 1 adulte.',
                extraBedNeedsChild: 'Les lits enfant supplementaires sont reserves aux enfants.',
                babyBedNeedsBaby: 'Les lits bebe sont reserves aux bebes.',
                extraBedPerRoom: 'Un seul lit enfant supplementaire est possible par chambre.',
                babyBedPerRoom: 'Un seul lit bebe est possible par chambre.',
                occupancyRoomsRequired: 'Selectionnez plus de chambres ou ajoutez un lit enfant supplementaire pour ce nombre de personnes.'
            }
        },
        de: {
            availabilityTitle: 'Waehlen Sie Daten, Extras und Zimmer',
            availabilityIntro: 'Waehlen Sie zuerst Ihren Aufenthalt. Danach sehen Sie pro Zimmer sofort die Verfuegbarkeit und den exakten Gesamtpreis.',
            continueButton: 'Weiter',
            adultCountLabel: 'Anzahl Erwachsene',
            childCountLabel: 'Anzahl Kinder bis 12 Jahre',
            babyCountLabel: 'Anzahl Babys',
            babyBedLabel: 'Babybett',
            babyBedNote: 'Kostenlos',
            summaryGuestCounts: '{adults} Erwachsene, {children} Kinder, {babies} Babys',
            calendarMonthSelectLabel: 'Monat waehlen',
            calendarYearSelectLabel: 'Jahr waehlen',
            calendarTodayButton: 'Dieser Monat',
            guestIntro: 'Diese Daten verwenden wir fuer Reservierung und Zahlung.',
            phoneLabel: 'Telefonnummer',
            phonePlaceholder: '+49 151 23456789',
            addressTitle: 'Adresse',
            addressIntro: 'Verwenden Sie die Adresse des Hauptgasts.',
            streetLabel: 'Strasse',
            streetPlaceholder: 'Strassenname',
            houseNumberLabel: 'Hausnummer',
            houseNumberPlaceholder: '12A',
            postalCodeLabel: 'Postleitzahl',
            postalCodePlaceholder: '10115',
            cityLabel: 'Ort',
            cityPlaceholder: 'Berlin',
            countryLabel: 'Land',
            countryPlaceholder: 'Deutschland',
            summaryTitle: 'Zusammenfassung',
            summaryIntro: 'Hier sehen Sie sofort die gewaehlten Zimmer und den Gesamtbetrag.',
            summaryStayPrice: 'Aufenthalt ohne MwSt.',
            summarySubtotal: 'Gesamt ohne MwSt.',
            summaryExtras: 'Extras ohne MwSt.',
            summaryVat: 'MwSt. 6%',
            summaryTotal: 'Gesamt inkl. MwSt.',
            summaryRateDetail: '{nightsLabel} x {price}',
            summaryExtraBedTitle: 'Zusaetzliches Kinderbett',
            summarySingleOccupancyDiscountTitle: 'Rabatt 1 Person {room}',
            validation: {
                phoneRequired: 'Geben Sie Ihre Telefonnummer ein.',
                phoneInvalid: 'Verwenden Sie eine gueltige Telefonnummer.',
                streetRequired: 'Geben Sie Ihre Strasse ein.',
                houseNumberRequired: 'Geben Sie Ihre Hausnummer ein.',
                postalCodeRequired: 'Geben Sie Ihre Postleitzahl ein.',
                cityRequired: 'Geben Sie Ihren Ort ein.',
                countryRequired: 'Geben Sie Ihr Land ein.',
                adultCountRequired: 'Geben Sie mindestens einen Erwachsenen ein.',
                extraBedNeedsChild: 'Zusaetzliche Kinderbetten koennen nur fuer Kinder genutzt werden.',
                babyBedNeedsBaby: 'Babybetten koennen nur fuer Babys genutzt werden.',
                extraBedPerRoom: 'Pro Zimmer ist nur 1 zusaetzliches Kinderbett moeglich.',
                babyBedPerRoom: 'Pro Zimmer ist nur 1 Babybett moeglich.',
                occupancyRoomsRequired: 'Waehlen Sie mehr Zimmer oder ein zusaetzliches Kinderbett fuer diese Anzahl Gaeste.'
            }
        }
    };

    const taxTranslationOverrides = {
        nl: {
            booking: { roomTotalInclVat: 'totaal incl. btw' },
            payment: { subtotalLabel: 'Subtotaal excl. btw', vatLabel: 'Btw 6%', totalLabel: 'Totaal incl. btw', bookWithoutPayment: 'Betaal achteraf' },
            paymentSuccess: { subtotalLabel: 'Subtotaal excl. btw', vatLabel: 'Btw 6%', totalLabel: 'Totaal betaald incl. btw', totalReservedLabel: 'Totaal incl. btw', reservationEyebrow: 'Reservering ontvangen', reservationText: 'Je reservering is bevestigd en de kamers zijn voor je geboekt.', statusReserved: 'Reservering bevestigd.' }
        },
        en: {
            booking: { roomTotalInclVat: 'total incl. VAT' },
            payment: { subtotalLabel: 'Subtotal excl. VAT', vatLabel: 'VAT 6%', totalLabel: 'Total incl. VAT', bookWithoutPayment: 'Pay later' },
            paymentSuccess: { subtotalLabel: 'Subtotal excl. VAT', vatLabel: 'VAT 6%', totalLabel: 'Total paid incl. VAT', totalReservedLabel: 'Total incl. VAT', reservationEyebrow: 'Reservation received', reservationText: 'Your reservation is confirmed and the rooms are booked for you.', statusReserved: 'Reservation confirmed.' }
        },
        pt: {
            booking: { roomTotalInclVat: 'total com IVA' },
            payment: { subtotalLabel: 'Subtotal sem IVA', vatLabel: 'IVA 6%', totalLabel: 'Total com IVA', bookWithoutPayment: 'Pagar depois' },
            paymentSuccess: { subtotalLabel: 'Subtotal sem IVA', vatLabel: 'IVA 6%', totalLabel: 'Total pago com IVA', totalReservedLabel: 'Total com IVA', reservationEyebrow: 'Reserva recebida', reservationText: 'A sua reserva esta confirmada e os quartos ficaram reservados.', statusReserved: 'Reserva confirmada.' }
        },
        es: {
            booking: { roomTotalInclVat: 'total con IVA' },
            payment: { subtotalLabel: 'Subtotal sin IVA', vatLabel: 'IVA 6%', totalLabel: 'Total con IVA', bookWithoutPayment: 'Pagar despues' },
            paymentSuccess: { subtotalLabel: 'Subtotal sin IVA', vatLabel: 'IVA 6%', totalLabel: 'Total pagado con IVA', totalReservedLabel: 'Total con IVA', reservationEyebrow: 'Reserva recibida', reservationText: 'Tu reserva esta confirmada y las habitaciones quedan reservadas.', statusReserved: 'Reserva confirmada.' }
        },
        fr: {
            booking: { roomTotalInclVat: 'total TTC' },
            payment: { subtotalLabel: 'Sous-total hors TVA', vatLabel: 'TVA 6%', totalLabel: 'Total TTC', bookWithoutPayment: 'Payer plus tard' },
            paymentSuccess: { subtotalLabel: 'Sous-total hors TVA', vatLabel: 'TVA 6%', totalLabel: 'Total paye TTC', totalReservedLabel: 'Total TTC', reservationEyebrow: 'Reservation recue', reservationText: 'Votre reservation est confirmee et les chambres sont reservees pour vous.', statusReserved: 'Reservation confirmee.' }
        },
        de: {
            booking: { roomTotalInclVat: 'gesamt inkl. MwSt.' },
            payment: { subtotalLabel: 'Zwischensumme ohne MwSt.', vatLabel: 'MwSt. 6%', totalLabel: 'Gesamt inkl. MwSt.', bookWithoutPayment: 'Spaeter bezahlen' },
            paymentSuccess: { subtotalLabel: 'Zwischensumme ohne MwSt.', vatLabel: 'MwSt. 6%', totalLabel: 'Bezahlt inkl. MwSt.', totalReservedLabel: 'Gesamt inkl. MwSt.', reservationEyebrow: 'Reservierung erhalten', reservationText: 'Ihre Reservierung ist bestaetigt und die Zimmer sind fuer Sie gebucht.', statusReserved: 'Reservierung bestaetigt.' }
        }
    };

    const unitLabels = {
        nl: {
            night: { one: 'nacht', other: 'nachten' },
            adult: { one: 'volwassene', other: 'volwassenen' },
            child: { one: 'kind', other: 'kinderen' },
            baby: { one: 'baby', other: 'baby\'s' }
        },
        en: {
            night: { one: 'night', other: 'nights' },
            adult: { one: 'adult', other: 'adults' },
            child: { one: 'child', other: 'children' },
            baby: { one: 'baby', other: 'babies' }
        },
        pt: {
            night: { one: 'noite', other: 'noites' },
            adult: { one: 'adulto', other: 'adultos' },
            child: { one: 'crianca', other: 'criancas' },
            baby: { one: 'bebe', other: 'bebes' }
        },
        es: {
            night: { one: 'noche', other: 'noches' },
            adult: { one: 'adulto', other: 'adultos' },
            child: { one: 'nino', other: 'ninos' },
            baby: { one: 'bebe', other: 'bebes' }
        },
        fr: {
            night: { one: 'nuit', other: 'nuits' },
            adult: { one: 'adulte', other: 'adultes' },
            child: { one: 'enfant', other: 'enfants' },
            baby: { one: 'bebe', other: 'bebes' }
        },
        de: {
            night: { one: 'Nacht', other: 'Naechte' },
            adult: { one: 'Erwachsener', other: 'Erwachsene' },
            child: { one: 'Kind', other: 'Kinder' },
            baby: { one: 'Baby', other: 'Babys' }
        }
    };

    Object.entries(bookingOverrides).forEach(([language, overrides]) => {
        translations[language].booking = {
            ...translations[language].booking,
            ...overrides,
            validation: {
                ...translations[language].booking.validation,
                ...overrides.validation
            }
        };
    });

    Object.entries(taxTranslationOverrides).forEach(([language, overrides]) => {
        translations[language].booking = {
            ...translations[language].booking,
            ...overrides.booking
        };
        translations[language].payment = {
            ...translations[language].payment,
            ...overrides.payment
        };
        translations[language].paymentSuccess = {
            ...translations[language].paymentSuccess,
            ...overrides.paymentSuccess
        };
    });

    let currentLanguage = window.localStorage.getItem(storageKey) || 'nl';
    if (!supportedLanguages.includes(currentLanguage)) {
        currentLanguage = 'nl';
    }

    function deepGet(target, path) {
        return path.split('.').reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), target);
    }

    function interpolate(template, params) {
        return String(template).replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');
    }

    function t(key, params = {}) {
        if (key === 'booking.summaryNights' && Object.prototype.hasOwnProperty.call(params, 'nights')) {
            return formatUnit('night', params.nights);
        }

        if (key === 'booking.summaryGuestCounts' && (
            Object.prototype.hasOwnProperty.call(params, 'adults')
            || Object.prototype.hasOwnProperty.call(params, 'children')
            || Object.prototype.hasOwnProperty.call(params, 'babies')
        )) {
            return formatGuestCounts({
                adults: params.adults,
                children: params.children,
                babies: params.babies
            });
        }

        const active = translations[currentLanguage] || translations.nl;
        const fallback = translations.nl;
        const template = deepGet(active, key) ?? deepGet(fallback, key) ?? key;
        return interpolate(template, params);
    }

    function formatCurrency(cents) {
        return new Intl.NumberFormat(locales[currentLanguage] || locales.nl, {
            style: 'currency',
            currency: 'EUR'
        }).format(Number(cents || 0) / 100);
    }

    function formatUnit(unit, count) {
        const value = Number(count || 0);
        const labels = unitLabels[currentLanguage]?.[unit] || unitLabels.nl[unit] || { one: unit, other: unit };
        return `${value} ${value === 1 ? labels.one : labels.other}`;
    }

    function formatGuestCounts({ adults = 0, children = 0, babies = 0 } = {}) {
        const parts = [
            formatUnit('adult', adults),
            formatUnit('child', children),
            formatUnit('baby', babies)
        ];

        return new Intl.ListFormat(locales[currentLanguage] || locales.nl, {
            style: 'long',
            type: 'conjunction'
        }).format(parts);
    }

    function applyTranslations(root = document) {
        root.querySelectorAll('[data-i18n]').forEach((element) => {
            element.textContent = t(element.dataset.i18n);
        });

        root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
            element.placeholder = t(element.dataset.i18nPlaceholder);
        });

        document.documentElement.lang = currentLanguage;
        const page = document.body.dataset.page;
        if (page) {
            document.title = t(`meta.${page}`);
        }

        document.querySelectorAll('[data-language]').forEach((button) => {
            button.classList.toggle('is-active', button.dataset.language === currentLanguage);
        });
    }

    function setLanguage(language) {
        if (!supportedLanguages.includes(language)) {
            return;
        }

        currentLanguage = language;
        window.localStorage.setItem(storageKey, language);
        applyTranslations();
        window.dispatchEvent(new CustomEvent('csl:languagechange', { detail: { language } }));
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-language]').forEach((button) => {
            button.addEventListener('click', () => setLanguage(button.dataset.language));
        });

        applyTranslations();
    });

    return {
        t,
        setLanguage,
        applyTranslations,
        formatCurrency,
        formatUnit,
        formatGuestCounts,
        getLanguage: () => currentLanguage,
        getLocale: () => locales[currentLanguage] || locales.nl
    };
})();

window.CSLI18N = CSLI18N;