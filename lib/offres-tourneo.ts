// V2 remains free. These planned V3 values are not enforcement rules in the current app.
export const ACCES_V2 = Object.freeze({version:'V2',paiementActif:false,expert:true,tournoisParMois:null,limiteParticipantsCommerciale:null});
export const PROJET_V3 = Object.freeze({achat:'unique-a-vie',abonnement:false,gratuit:{tournoisParMois:5,limiteParticipants:null},expert:{tournoisParMois:null,limiteParticipants:null},photosProposees:{gratuit:{quota:100,jours:15},expert:{quota:300,jours:90}}});
