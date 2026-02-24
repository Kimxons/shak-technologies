// GL Branch Details Module - Event Handlers and Logic

console.log('[GL Branch Details] Script loaded at:', new Date().toISOString());

// State and session data
let GeneralLedgerService = null;
let isAddMode = false; // Track if we're in add mode
let addedAccounts = []; // Track manually added accounts
let allBranches = [{"OurBranchID":"0101","BranchName":"Head Office"},{"OurBranchID":"0102","BranchName":"Head Office IFRS"},{"OurBranchID":"0103","BranchName":"Regional Office"},{"OurBranchID":"0104","BranchName":"IBO"},{"OurBranchID":"0105","BranchName":"Digital Banking Operation"},{"OurBranchID":"0201","BranchName":"Fenoteselam  District"},{"OurBranchID":"0202","BranchName":"Zenbaba"},{"OurBranchID":"0203","BranchName":"Meshenti"},{"OurBranchID":"0204","BranchName":"Wojet"},{"OurBranchID":"0205","BranchName":"Addiet"},{"OurBranchID":"0206","BranchName":"TisAbay"},{"OurBranchID":"0207","BranchName":"Merawi"},{"OurBranchID":"0208","BranchName":"Wotet Abay"},{"OurBranchID":"0209","BranchName":"Durbetie"},{"OurBranchID":"0210","BranchName":"Yismala"},{"OurBranchID":"0211","BranchName":"Finote-selam"},{"OurBranchID":"0212","BranchName":"Burie"},{"OurBranchID":"0213","BranchName":"Sekela"},{"OurBranchID":"0214","BranchName":"Gebeze Mariam"},{"OurBranchID":"0215","BranchName":"Wad"},{"OurBranchID":"0216","BranchName":"Feresbet"},{"OurBranchID":"0217","BranchName":"Dembecha"},{"OurBranchID":"0218","BranchName":"Shindie"},{"OurBranchID":"0219","BranchName":"Mankusa"},{"OurBranchID":"0220","BranchName":"Gonji"},{"OurBranchID":"0221","BranchName":"Shumabo"},{"OurBranchID":"0222","BranchName":"Kunzila"},{"OurBranchID":"0223","BranchName":"Kedemit Lalibela"},{"OurBranchID":"0224","BranchName":"DebreMawi"},{"OurBranchID":"0225","BranchName":"Rim"},{"OurBranchID":"0226","BranchName":"Jiga"},{"OurBranchID":"0227","BranchName":"Quch"},{"OurBranchID":"0228","BranchName":"Filkilk"},{"OurBranchID":"0229","BranchName":"Liben"},{"OurBranchID":"0230","BranchName":"Mecha"},{"OurBranchID":"0231","BranchName":"Goshiye"},{"OurBranchID":"0232","BranchName":"Ghion"},{"OurBranchID":"0233","BranchName":"Donaber"},{"OurBranchID":"0234","BranchName":"Wogedad"},{"OurBranchID":"0235","BranchName":"Agut"},{"OurBranchID":"0236","BranchName":"Genetabo"},{"OurBranchID":"0237","BranchName":"Afessa"},{"OurBranchID":"0238","BranchName":"Birakat"},{"OurBranchID":"0239","BranchName":"Tame"},{"OurBranchID":"0240","BranchName":"Zegie"},{"OurBranchID":"0241","BranchName":"Anjeny"},{"OurBranchID":"0242","BranchName":"Agita"},{"OurBranchID":"0243","BranchName":"Ginib Geregera"},{"OurBranchID":"0244","BranchName":"Ambiki"},{"OurBranchID":"0245","BranchName":"Mentawuha"},{"OurBranchID":"0246","BranchName":"Avadira"},{"OurBranchID":"0247","BranchName":"Gissa"},{"OurBranchID":"0248","BranchName":"Fagita"},{"OurBranchID":"0249","BranchName":"AddisAlem"},{"OurBranchID":"0250","BranchName":"Chiguali"},{"OurBranchID":"0251","BranchName":"Dagi  Abiyot"},{"OurBranchID":"0252","BranchName":"Amarit"},{"OurBranchID":"0253","BranchName":"Yezeleka"},{"OurBranchID":"0254","BranchName":"Yechereka"},{"OurBranchID":"0255","BranchName":"Chimba"},{"OurBranchID":"0256","BranchName":"Makisegnen Dengra"},{"OurBranchID":"0257","BranchName":"Markuma"},{"OurBranchID":"0258","BranchName":"Achefer"},{"OurBranchID":"0259","BranchName":"Mehalgenet"},{"OurBranchID":"0260","BranchName":"Geray"},{"OurBranchID":"0261","BranchName":"Abichikli"},{"OurBranchID":"0262","BranchName":"Gula"},{"OurBranchID":"0263","BranchName":"Burie ber"},{"OurBranchID":"0264","BranchName":"Wonberma"},{"OurBranchID":"0265","BranchName":"Alefa Basie"},{"OurBranchID":"0266","BranchName":"Gish-Abay"},{"OurBranchID":"0267","BranchName":"Waza"},{"OurBranchID":"0268","BranchName":"Tikur Wuha"},{"OurBranchID":"0272","BranchName":"Kimbaba"},{"OurBranchID":"0290","BranchName":"Test"},{"OurBranchID":"0301","BranchName":"Injebara  District"},{"OurBranchID":"0302","BranchName":"Kosober"},{"OurBranchID":"0303","BranchName":"Fetam"},{"OurBranchID":"0304","BranchName":"Addis Kidam"},{"OurBranchID":"0305","BranchName":"Agunta"},{"OurBranchID":"0306","BranchName":"Agew Gimjabet"},{"OurBranchID":"0307","BranchName":"Ardi"},{"OurBranchID":"0308","BranchName":"Azena"},{"OurBranchID":"0309","BranchName":"Chara"},{"OurBranchID":"0310","BranchName":"Jawi"},{"OurBranchID":"0311","BranchName":"Zigem"},{"OurBranchID":"0312","BranchName":"Kidamaja"},{"OurBranchID":"0313","BranchName":"Zengena"},{"OurBranchID":"0314","BranchName":"Ehudit"},{"OurBranchID":"0315","BranchName":"Ajis"},{"OurBranchID":"0316","BranchName":"Bitwoded Mengesha Jemberie"},{"OurBranchID":"0317","BranchName":"Metekel"},{"OurBranchID":"0318","BranchName":"Bitileta"},{"OurBranchID":"0319","BranchName":"Gilgel Beles"},{"OurBranchID":"0320","BranchName":"Pawi"},{"OurBranchID":"0321","BranchName":"Work Meda"},{"OurBranchID":"0322","BranchName":"Aduk"},{"OurBranchID":"0323","BranchName":"ASSOSA"},{"OurBranchID":"0325","BranchName":"Tillil"},{"OurBranchID":"0327","BranchName":"Shashina"},{"OurBranchID":"0328","BranchName":"Deq"},{"OurBranchID":"0329","BranchName":"Gubala"},{"OurBranchID":"0401","BranchName":"Debremarkos  District"},{"OurBranchID":"0402","BranchName":"Debremarkos"},{"OurBranchID":"0403","BranchName":"Lumamie"},{"OurBranchID":"0404","BranchName":"Amanuel"},{"OurBranchID":"0405","BranchName":"Yejubie"},{"OurBranchID":"0406","BranchName":"Rob_Gebia"},{"OurBranchID":"0407","BranchName":"Gozamen"},{"OurBranchID":"0408","BranchName":"Debre_Elias"},{"OurBranchID":"0409","BranchName":"Amber"},{"OurBranchID":"0410","BranchName":"Digotsion"},{"OurBranchID":"0411","BranchName":"Dejen"},{"OurBranchID":"0412","BranchName":"Degasegn"},{"OurBranchID":"0413","BranchName":"Yebokela"},{"OurBranchID":"0414","BranchName":"Yetmen"},{"OurBranchID":"0415","BranchName":"Bichena"},{"OurBranchID":"0416","BranchName":"Yoduha"},{"OurBranchID":"0417","BranchName":"Quyi"},{"OurBranchID":"0418","BranchName":"Enarje"},{"OurBranchID":"0419","BranchName":"Mota"},{"OurBranchID":"0420","BranchName":"Keranio"},{"OurBranchID":"0421","BranchName":"Sedie"},{"OurBranchID":"0422","BranchName":"Goncha"},{"OurBranchID":"0423","BranchName":"Abiyot Adebabay"},{"OurBranchID":"0424","BranchName":"Yelamgej"},{"OurBranchID":"0425","BranchName":"WoynWuha"},{"OurBranchID":"0426","BranchName":"Felege_Berhan"},{"OurBranchID":"0427","BranchName":"Debre-Eyesus"},{"OurBranchID":"0428","BranchName":"Guaye"},{"OurBranchID":"0429","BranchName":"Chemo"},{"OurBranchID":"0430","BranchName":"Maza Genet"},{"OurBranchID":"0431","BranchName":"Woyra"},{"OurBranchID":"0432","BranchName":"Shebel"},{"OurBranchID":"0433","BranchName":"Girakidamen"},{"OurBranchID":"0434","BranchName":"Wojel"},{"OurBranchID":"0435","BranchName":"Kork"},{"OurBranchID":"0436","BranchName":"Chertekel"},{"OurBranchID":"0437","BranchName":"Gubaya"},{"OurBranchID":"0439","BranchName":"Dibo"},{"OurBranchID":"0440","BranchName":"Kernewari"},{"OurBranchID":"0441","BranchName":"Yekebehana"},{"OurBranchID":"0442","BranchName":"Libanos"},{"OurBranchID":"0443","BranchName":"Gedeb"},{"OurBranchID":"0446","BranchName":"Nabrayebalat"},{"OurBranchID":"0447","BranchName":"GetieSemanie"},{"OurBranchID":"0448","BranchName":"Dima"},{"OurBranchID":"0449","BranchName":"Asterio"},{"OurBranchID":"0450","BranchName":"Waber"},{"OurBranchID":"0451","BranchName":"Jeremes"},{"OurBranchID":"0452","BranchName":"Fendika"},{"OurBranchID":"0453","BranchName":"Yesenbet"},{"OurBranchID":"0454","BranchName":"Awuja"},{"OurBranchID":"0455","BranchName":"Gengerta"},{"OurBranchID":"0456","BranchName":"Jamagulma"},{"OurBranchID":"0457","BranchName":"Hadis Alemayehu"},{"OurBranchID":"0458","BranchName":"Debre Work"},{"OurBranchID":"0459","BranchName":"Merto Lemariam"},{"OurBranchID":"0460","BranchName":"Gendeweyen"},{"OurBranchID":"0461","BranchName":"Yetnora"},{"OurBranchID":"0462","BranchName":"Ayermarefiya"},{"OurBranchID":"0463","BranchName":"Gofchima"},{"OurBranchID":"0464","BranchName":"Genet"},{"OurBranchID":"0465","BranchName":"Choqie"},{"OurBranchID":"0466","BranchName":"Machakel"},{"OurBranchID":"0467","BranchName":"Bogena"},{"OurBranchID":"0468","BranchName":"Baso Ber"},{"OurBranchID":"0469","BranchName":"Tedila Gualu"},{"OurBranchID":"0470","BranchName":"Leilte Wolete Esrael"},{"OurBranchID":"0471","BranchName":"Abima"},{"OurBranchID":"0501","BranchName":"Gonder District"},{"OurBranchID":"0502","BranchName":"Tewodros"},{"OurBranchID":"0503","BranchName":"Chilga Branch"},{"OurBranchID":"0504","BranchName":"Koladeba"},{"OurBranchID":"0505","BranchName":"Delgie"},{"OurBranchID":"0506","BranchName":"Alefa"},{"OurBranchID":"0507","BranchName":"Gonder Zuria"},{"OurBranchID":"0508","BranchName":"Metema"},{"OurBranchID":"0509","BranchName":"Hamus Gebeya"},{"OurBranchID":"0510","BranchName":"Dimaza"},{"OurBranchID":"0511","BranchName":"Tikledengay"},{"OurBranchID":"0512","BranchName":"Sanja"},{"OurBranchID":"0513","BranchName":"Gohala"},{"OurBranchID":"0514","BranchName":"Zuy Hamusit"},{"OurBranchID":"0515","BranchName":"Arbaya"},{"OurBranchID":"0516","BranchName":"Walya"},{"OurBranchID":"0517","BranchName":"Ambagiorgis"},{"OurBranchID":"0518","BranchName":"Gedebye"},{"OurBranchID":"0519","BranchName":"Adarkay"},{"OurBranchID":"0520","BranchName":"Ayalew Biru"},{"OurBranchID":"0521","BranchName":"Janamora"},{"OurBranchID":"0522","BranchName":"Beyeda"},{"OurBranchID":"0523","BranchName":"Meder-Genete"},{"OurBranchID":"0524","BranchName":"Soroka"},{"OurBranchID":"0525","BranchName":"Shinfa"},{"OurBranchID":"0526","BranchName":"Gelego"},{"OurBranchID":"0527","BranchName":"Chuahit"},{"OurBranchID":"0528","BranchName":"Negadie Bahir"},{"OurBranchID":"0529","BranchName":"Kirakir"},{"OurBranchID":"0530","BranchName":"Maraki"},{"OurBranchID":"0531","BranchName":"Kokit"},{"OurBranchID":"0532","BranchName":"Seraba"},{"OurBranchID":"0533","BranchName":"Chonchoq"},{"OurBranchID":"0534","BranchName":"Aba Samuel"},{"OurBranchID":"0535","BranchName":"Leul-Alemayehu"},{"OurBranchID":"0536","BranchName":"Abirhajira"},{"OurBranchID":"0537","BranchName":"Enfiranz"},{"OurBranchID":"0538","BranchName":"Zarima"},{"OurBranchID":"0539","BranchName":"Metema Yohanes"},{"OurBranchID":"0540","BranchName":"AtsedeMariam"},{"OurBranchID":"0541","BranchName":"Dikularba"},{"OurBranchID":"0542","BranchName":"Masero"},{"OurBranchID":"0543","BranchName":"Ayimba"},{"OurBranchID":"0544","BranchName":"Wogera"},{"OurBranchID":"0545","BranchName":"Wokin"},{"OurBranchID":"0546","BranchName":"Arada"},{"OurBranchID":"0547","BranchName":"Debark"},{"OurBranchID":"0548","BranchName":"Tseda"},{"OurBranchID":"0549","BranchName":"Dembiya Robit"},{"OurBranchID":"0550","BranchName":"Dabat"},{"OurBranchID":"0551","BranchName":"Shahura"},{"OurBranchID":"0552","BranchName":"Taqusa"},{"OurBranchID":"0553","BranchName":"Makesegnit"},{"OurBranchID":"0554","BranchName":"Airport"},{"OurBranchID":"0556","BranchName":"Hidasie"},{"OurBranchID":"0557","BranchName":"Samuna Ber"},{"OurBranchID":"0558","BranchName":"Gorgora"},{"OurBranchID":"0560","BranchName":"Mussiebamb"},{"OurBranchID":"0561","BranchName":"Chandiba"},{"OurBranchID":"0562","BranchName":"Degoma"},{"OurBranchID":"0563","BranchName":"Bliko"},{"OurBranchID":"0564","BranchName":"Woynoch"},{"OurBranchID":"0565","BranchName":"Silarie"},{"OurBranchID":"0566","BranchName":"Telemt"},{"OurBranchID":"0567","BranchName":"Mintiwab"},{"OurBranchID":"0601","BranchName":"Debretabor District"},{"OurBranchID":"0602","BranchName":"Debretabor"},{"OurBranchID":"0603","BranchName":"Anbesamie"},{"OurBranchID":"0604","BranchName":"Aferewanat"},{"OurBranchID":"0605","BranchName":"Estie"},{"OurBranchID":"0606","BranchName":"Jaragedu"},{"OurBranchID":"0607","BranchName":"Andabet"},{"OurBranchID":"0608","BranchName":"Mekrie"},{"OurBranchID":"0609","BranchName":"Gassay"},{"OurBranchID":"0610","BranchName":"Nefas_Mewcha"},{"OurBranchID":"0611","BranchName":"Sali"},{"OurBranchID":"0612","BranchName":"Arib gebeya"},{"OurBranchID":"0613","BranchName":"Simada"},{"OurBranchID":"0614","BranchName":"Aleka G/Hana"},{"OurBranchID":"0615","BranchName":"Agele Hana"},{"OurBranchID":"0616","BranchName":"Anbo Meda"},{"OurBranchID":"0617","BranchName":"Debre Abajalie"},{"OurBranchID":"0618","BranchName":"Dera Hamusit"},{"OurBranchID":"0619","BranchName":"Alem Ber"},{"OurBranchID":"0620","BranchName":"Fert"},{"OurBranchID":"0621","BranchName":"Kimir_Dingay"},{"OurBranchID":"0622","BranchName":"Sedi_Muja"},{"OurBranchID":"0623","BranchName":"Chena"},{"OurBranchID":"0624","BranchName":"Wolela Bahir"},{"OurBranchID":"0625","BranchName":"Qoma"},{"OurBranchID":"0626","BranchName":"Selemeya"},{"OurBranchID":"0627","BranchName":"Mahdere Mariam"},{"OurBranchID":"0628","BranchName":"Zagoch"},{"OurBranchID":"0629","BranchName":"Mikael Debre"},{"OurBranchID":"0630","BranchName":"Sana"},{"OurBranchID":"0631","BranchName":"Yifag"},{"OurBranchID":"0632","BranchName":"Guramba"},{"OurBranchID":"0633","BranchName":"Adada"},{"OurBranchID":"0634","BranchName":"Qualisa"},{"OurBranchID":"0635","BranchName":"Yequasa"},{"OurBranchID":"0636","BranchName":"Meketewa"},{"OurBranchID":"0637","BranchName":"Agate"},{"OurBranchID":"0638","BranchName":"Jibasera"},{"OurBranchID":"0639","BranchName":"Ebinat"},{"OurBranchID":"0640","BranchName":"Wogeda"},{"OurBranchID":"0641","BranchName":"Hagere Genet"},{"OurBranchID":"0642","BranchName":"Melat"},{"OurBranchID":"0643","BranchName":"Fogera"},{"OurBranchID":"0644","BranchName":"Melo"},{"OurBranchID":"0645","BranchName":"Hagere Tsigie"},{"OurBranchID":"0646","BranchName":"Begemdir"},{"OurBranchID":"0647","BranchName":"Gafat"},{"OurBranchID":"0648","BranchName":"Megendi"},{"OurBranchID":"0649","BranchName":"Shimie"},{"OurBranchID":"0650","BranchName":"Dera Wogedamie"},{"OurBranchID":"0651","BranchName":"Addis Alem Gasay"},{"OurBranchID":"0652","BranchName":"Gob Gob"},{"OurBranchID":"0701","BranchName":"Woldiya District"},{"OurBranchID":"0702","BranchName":"Weldiya"},{"OurBranchID":"0703","BranchName":"Kobo"},{"OurBranchID":"0704","BranchName":"Robit"},{"OurBranchID":"0705","BranchName":"Mersa"},{"OurBranchID":"0706","BranchName":"Wurgessa"},{"OurBranchID":"0707","BranchName":"Delanta"},{"OurBranchID":"0708","BranchName":"Kurba"},{"OurBranchID":"0709","BranchName":"Sanka"},{"OurBranchID":"0710","BranchName":"Mujja"},{"OurBranchID":"0711","BranchName":"Estayish"},{"OurBranchID":"0712","BranchName":"Gashena"},{"OurBranchID":"0713","BranchName":"Kon"},{"OurBranchID":"0714","BranchName":"Flakit"},{"OurBranchID":"0715","BranchName":"Lalibela"},{"OurBranchID":"0716","BranchName":"Hara"},{"OurBranchID":"0717","BranchName":"KeberoMeda"},{"OurBranchID":"0718","BranchName":"Ayina"},{"OurBranchID":"0719","BranchName":"Sirinka"},{"OurBranchID":"0720","BranchName":"Telaje Hamusit"},{"OurBranchID":"0721","BranchName":"Tekulesh"},{"OurBranchID":"0722","BranchName":"Gobye"},{"OurBranchID":"0723","BranchName":"Sriel"},{"OurBranchID":"0724","BranchName":"Dibko"},{"OurBranchID":"0725","BranchName":"ShariyaGenet"},{"OurBranchID":"0726","BranchName":"Dildiy"},{"OurBranchID":"0727","BranchName":"Girana"},{"OurBranchID":"0728","BranchName":"KulMesk"},{"OurBranchID":"0729","BranchName":"Beklo Manekiya"},{"OurBranchID":"0730","BranchName":"Zoble"},{"OurBranchID":"0731","BranchName":"Wondach"},{"OurBranchID":"0732","BranchName":"Kewziba"},{"OurBranchID":"0733","BranchName":"Agirt"},{"OurBranchID":"0734","BranchName":"Hamusit"},{"OurBranchID":"0735","BranchName":"Lalkiw"},{"OurBranchID":"0736","BranchName":"Raya"},{"OurBranchID":"0737","BranchName":"Chena"},{"OurBranchID":"0738","BranchName":"Mecharie"},{"OurBranchID":"0739","BranchName":"Ahuntegegn"},{"OurBranchID":"0740","BranchName":"Haro"},{"OurBranchID":"0741","BranchName":"Kob"},{"OurBranchID":"0742","BranchName":"Debre Zebit"},{"OurBranchID":"0743","BranchName":"Aradom"},{"OurBranchID":"0744","BranchName":"Megenagna"},{"OurBranchID":"0745","BranchName":"Merto"},{"OurBranchID":"0746","BranchName":"Arbit"},{"OurBranchID":"0747","BranchName":"Dufti Hamusit"},{"OurBranchID":"0748","BranchName":"Kalim"},{"OurBranchID":"0749","BranchName":"Bilbala"},{"OurBranchID":"0750","BranchName":"Geregera"},{"OurBranchID":"0751","BranchName":"Mugad"},{"OurBranchID":"0752","BranchName":"Aboare"},{"OurBranchID":"0801","BranchName":"Sekota District"},{"OurBranchID":"0802","BranchName":"Sekota"},{"OurBranchID":"0803","BranchName":"Seriya"},{"OurBranchID":"0804","BranchName":"Woleh"},{"OurBranchID":"0805","BranchName":"Tsitsiqa"},{"OurBranchID":"0806","BranchName":"Niruaq"},{"OurBranchID":"0807","BranchName":"Aseketema"},{"OurBranchID":"0808","BranchName":"Chilla"},{"OurBranchID":"0809","BranchName":"Amedewerk"},{"OurBranchID":"0810","BranchName":"Tsata"},{"OurBranchID":"0811","BranchName":"Meshaha"},{"OurBranchID":"0812","BranchName":"Mkenziba"},{"OurBranchID":"0813","BranchName":"Kidamit"},{"OurBranchID":"0814","BranchName":"Silda"},{"OurBranchID":"0815","BranchName":"Dehana Arbit"},{"OurBranchID":"0816","BranchName":"Cherkos"},{"OurBranchID":"0817","BranchName":"As-Ziva"},{"OurBranchID":"0818","BranchName":"Mekelle"},{"OurBranchID":"0901","BranchName":"Dessie  District"},{"OurBranchID":"0902","BranchName":"Lakomelza"},{"OurBranchID":"0903","BranchName":"Ayiteyef"},{"OurBranchID":"0904","BranchName":"Kombolcha"},{"OurBranchID":"0905","BranchName":"Harbu"},{"OurBranchID":"0906","BranchName":"Degan"},{"OurBranchID":"0907","BranchName":"Salmeny"},{"OurBranchID":"0908","BranchName":"Sulula"},{"OurBranchID":"0909","BranchName":"Haik"},{"OurBranchID":"0910","BranchName":"Bistima"},{"OurBranchID":"0911","BranchName":"Wuchallie"},{"OurBranchID":"0912","BranchName":"Kutaber"},{"OurBranchID":"0913","BranchName":"Guguftu"},{"OurBranchID":"0914","BranchName":"Woreilu"},{"OurBranchID":"0915","BranchName":"Jamma"},{"OurBranchID":"0916","BranchName":"WeynAmba"},{"OurBranchID":"0917","BranchName":"Akesta"},{"OurBranchID":"0918","BranchName":"Genetie"},{"OurBranchID":"0919","BranchName":"Kelala"},{"OurBranchID":"0920","BranchName":"Liguama"},{"OurBranchID":"0921","BranchName":"Wegdie"},{"OurBranchID":"0922","BranchName":"Borena"},{"OurBranchID":"0923","BranchName":"Tewa"},{"OurBranchID":"0924","BranchName":"Sayent"},{"OurBranchID":"0925","BranchName":"Densa"},{"OurBranchID":"0926","BranchName":"Ajibar"},{"OurBranchID":"0927","BranchName":"Mekedela"},{"OurBranchID":"0928","BranchName":"Debre Zeyt"},{"OurBranchID":"0929","BranchName":"Buanbua Wuha"},{"OurBranchID":"0930","BranchName":"Gorenj"},{"OurBranchID":"0931","BranchName":"Ginba"},{"OurBranchID":"0932","BranchName":"Ewa"},{"OurBranchID":"0933","BranchName":"Bora"},{"OurBranchID":"0934","BranchName":"Medina"},{"OurBranchID":"0935","BranchName":"Tsehay-Mewcha"},{"OurBranchID":"0936","BranchName":"Tulu Lemi"},{"OurBranchID":"0937","BranchName":"Kabe"},{"OurBranchID":"0938","BranchName":"Keyafer"},{"OurBranchID":"0939","BranchName":"Bili"},{"OurBranchID":"0940","BranchName":"Wegel-Tena"},{"OurBranchID":"0941","BranchName":"Saint Ajibar"},{"OurBranchID":"0942","BranchName":"Shewaber"},{"OurBranchID":"0943","BranchName":"Worehimeno_Tenta"},{"OurBranchID":"0944","BranchName":"Degaga"},{"OurBranchID":"0945","BranchName":"Gashen"},{"OurBranchID":"0946","BranchName":"Bokekesa"},{"OurBranchID":"0947","BranchName":"Mareye"},{"OurBranchID":"0948","BranchName":"Dager"},{"OurBranchID":"0949","BranchName":"Mume Diguguru"},{"OurBranchID":"0950","BranchName":"Mumie"},{"OurBranchID":"0951","BranchName":"Segnogebeya"},{"OurBranchID":"0952","BranchName":"Kire"},{"OurBranchID":"0953","BranchName":"Dengelega"},{"OurBranchID":"0954","BranchName":"Gedeba"},{"OurBranchID":"0955","BranchName":"Adame"},{"OurBranchID":"0956","BranchName":"Makefta"},{"OurBranchID":"0957","BranchName":"Abyagurba"},{"OurBranchID":"0958","BranchName":"Fita"},{"OurBranchID":"0959","BranchName":"Faji"},{"OurBranchID":"0960","BranchName":"Alif"},{"OurBranchID":"0961","BranchName":"Asayita"},{"OurBranchID":"0962","BranchName":"Chisa"},{"OurBranchID":"0963","BranchName":"Logiya"},{"OurBranchID":"0964","BranchName":"Wortej"},{"OurBranchID":"0966","BranchName":"Degolo"},{"OurBranchID":"0967","BranchName":"Work Mawcha"},{"OurBranchID":"0968","BranchName":"Piassa"},{"OurBranchID":"1001","BranchName":"Kemise  District"},{"OurBranchID":"1002","BranchName":"Shonkie"},{"OurBranchID":"1003","BranchName":"Senbetie"},{"OurBranchID":"1004","BranchName":"Chefarobit"},{"OurBranchID":"1005","BranchName":"Weledy"},{"OurBranchID":"1006","BranchName":"Awsa Ber"},{"OurBranchID":"1007","BranchName":"Tuche"},{"OurBranchID":"1009","BranchName":"Chireti"},{"OurBranchID":"1010","BranchName":"Aela"},{"OurBranchID":"1012","BranchName":"Wareka"},{"OurBranchID":"1101","BranchName":"Debreberehan  District"},{"OurBranchID":"1102","BranchName":"Debre Eba"},{"OurBranchID":"1103","BranchName":"Chacha"},{"OurBranchID":"1104","BranchName":"Ankober"},{"OurBranchID":"1105","BranchName":"Keyet"},{"OurBranchID":"1106","BranchName":"Gen-Ager"},{"OurBranchID":"1107","BranchName":"Enewari"},{"OurBranchID":"1108","BranchName":"Deneba"},{"OurBranchID":"1109","BranchName":"Hagere-Mariam"},{"OurBranchID":"1110","BranchName":"Minjar"},{"OurBranchID":"1111","BranchName":"Shenkora"},{"OurBranchID":"1112","BranchName":"Meriha Betie"},{"OurBranchID":"1113","BranchName":"Mida"},{"OurBranchID":"1114","BranchName":"Metehbela"},{"OurBranchID":"1115","BranchName":"Majetie"},{"OurBranchID":"1116","BranchName":"Ataye"},{"OurBranchID":"1117","BranchName":"Shewarobit"},{"OurBranchID":"1118","BranchName":"Debre-Sina"},{"OurBranchID":"1119","BranchName":"Seladengay"},{"OurBranchID":"1120","BranchName":"Mezezo"},{"OurBranchID":"1121","BranchName":"Mama"},{"OurBranchID":"1122","BranchName":"Wegerie"},{"OurBranchID":"1123","BranchName":"Gera"},{"OurBranchID":"1124","BranchName":"Zemero"},{"OurBranchID":"1125","BranchName":"Gishe"},{"OurBranchID":"1126","BranchName":"Debrebirhan"},{"OurBranchID":"1127","BranchName":"Mekoy"},{"OurBranchID":"1128","BranchName":"Lemi"},{"OurBranchID":"1129","BranchName":"Reima"},{"OurBranchID":"1130","BranchName":"Tebasie"},{"OurBranchID":"1131","BranchName":"Jihur"},{"OurBranchID":"1132","BranchName":"Koremash"},{"OurBranchID":"1133","BranchName":"Fetra"},{"OurBranchID":"1134","BranchName":"Kotu"},{"OurBranchID":"1135","BranchName":"Sasit"},{"OurBranchID":"1136","BranchName":"Rassa"},{"OurBranchID":"1137","BranchName":"Aleyu-Amba"},{"OurBranchID":"1138","BranchName":"Bolo-Giorgis"},{"OurBranchID":"1139","BranchName":"Bergibi"},{"OurBranchID":"1140","BranchName":"Anchekorer"},{"OurBranchID":"1141","BranchName":"Meleya"},{"OurBranchID":"1142","BranchName":"Armenya"},{"OurBranchID":"1143","BranchName":"Gorefo"},{"OurBranchID":"1144","BranchName":"Behera"},{"OurBranchID":"1145","BranchName":"GosheBado"},{"OurBranchID":"1146","BranchName":"Merab Merkato"},{"OurBranchID":"1147","BranchName":"Atse Zerayakob"},{"OurBranchID":"1148","BranchName":"Ras Abebe Aregay"},{"OurBranchID":"1149","BranchName":"Tsehaysina"},{"OurBranchID":"1150","BranchName":"AsaGirt"},{"OurBranchID":"1151","BranchName":"Molale"},{"OurBranchID":"1152","BranchName":"Bulga Ber"},{"OurBranchID":"1153","BranchName":"Yelen"},{"OurBranchID":"1154","BranchName":"Bulega"},{"OurBranchID":"1155","BranchName":"HaileMariam Mamo"},{"OurBranchID":"1156","BranchName":"Balchi"},{"OurBranchID":"1157","BranchName":"Shewareged Gedlie"},{"OurBranchID":"1158","BranchName":"Nigus Sahle Selassie"},{"OurBranchID":"1159","BranchName":"Dr. Kebede Micheal"},{"OurBranchID":"1160","BranchName":"Sheno"},{"OurBranchID":"1161","BranchName":"Nigus Hailemelekot"},{"OurBranchID":"1201","BranchName":"Bahir Dar"},{"OurBranchID":"1301","BranchName":"Genda wuha"},{"OurBranchID":"1401","BranchName":"Feres Megalebia"},{"OurBranchID":"1501","BranchName":"Fasil"},{"OurBranchID":"1601","BranchName":"Tayitu"},{"OurBranchID":"1701","BranchName":"Enjibara"},{"OurBranchID":"1801","BranchName":"Niguse T/Haymanot"},{"OurBranchID":"1901","BranchName":"Adago"},{"OurBranchID":"2001","BranchName":"Dessie"},{"OurBranchID":"2101","BranchName":"Atse Minilik"},{"OurBranchID":"2201","BranchName":"Biraro"},{"OurBranchID":"2300","BranchName":"AddisAbeba District"},{"OurBranchID":"2301","BranchName":"Addis Ababa"},{"OurBranchID":"2302","BranchName":"EdnaMall"},{"OurBranchID":"2303","BranchName":"Ayat"},{"OurBranchID":"2304","BranchName":"WolloSefer"},{"OurBranchID":"2305","BranchName":"Legehar"},{"OurBranchID":"2306","BranchName":"AradaGiorgis"},{"OurBranchID":"2307","BranchName":"Balderas"},{"OurBranchID":"2308","BranchName":"HanaMariam"},{"OurBranchID":"2309","BranchName":"GofaGebriel"},{"OurBranchID":"2310","BranchName":"Adissu Gebya"},{"OurBranchID":"2311","BranchName":"BulbulaMariam"},{"OurBranchID":"2312","BranchName":"GejaSefer"},{"OurBranchID":"2313","BranchName":"Lebu"},{"OurBranchID":"2314","BranchName":"SholaGebeya"},{"OurBranchID":"2315","BranchName":"EhelBerenda"},{"OurBranchID":"2316","BranchName":"BulbulaMedhanialem"},{"OurBranchID":"2317","BranchName":"HayahuletGolagol"},{"OurBranchID":"2318","BranchName":"Bethel Sefer Eyor"},{"OurBranchID":"2319","BranchName":"Ayer Tena"},{"OurBranchID":"2320","BranchName":"Kaliti"},{"OurBranchID":"2321","BranchName":"Summit 72"},{"OurBranchID":"2322","BranchName":"Mehal Summit"},{"OurBranchID":"2323","BranchName":"Bulgariya Mazoriya"},{"OurBranchID":"2324","BranchName":"Arat killo"},{"OurBranchID":"2325","BranchName":"Hawassa"},{"OurBranchID":"2326","BranchName":"Shalla"},{"OurBranchID":"2327","BranchName":"Gerji"},{"OurBranchID":"2328","BranchName":"Kotebie"},{"OurBranchID":"2329","BranchName":"Tulu Dimtu"},{"OurBranchID":"2330","BranchName":"Gelan Condominium"},{"OurBranchID":"2331","BranchName":"Goro"},{"OurBranchID":"2332","BranchName":"Adama Boku Shenen"},{"OurBranchID":"2333","BranchName":"Hangatu"},{"OurBranchID":"2334","BranchName":"Wosen"},{"OurBranchID":"2335","BranchName":"Ayat 05"},{"OurBranchID":"2336","BranchName":"Gurd Shola"},{"OurBranchID":"2337","BranchName":"Bolie"},{"OurBranchID":"2338","BranchName":"Lebu mebrat"},{"OurBranchID":"2339","BranchName":"Sebara babur"},{"OurBranchID":"2340","BranchName":"Bole 24"},{"OurBranchID":"2341","BranchName":"Bishoftu"},{"OurBranchID":"2342","BranchName":"Lafto"},{"OurBranchID":"2343","BranchName":"Meri Loqe"},{"OurBranchID":"2344","BranchName":"Yeka Abado"},{"OurBranchID":"2345","BranchName":"Saris"},{"OurBranchID":"2346","BranchName":"Beklo Bet"},{"OurBranchID":"2347","BranchName":"Semmit Atlet Mender"},{"OurBranchID":"2348","BranchName":"Africa Godana"},{"OurBranchID":"2349","BranchName":"Teppi"},{"OurBranchID":"2350","BranchName":"Dire Dawa"},{"OurBranchID":"2351","BranchName":"Haile Garment"},{"OurBranchID":"2352","BranchName":"Mehal Lafto"},{"OurBranchID":"2353","BranchName":"Saris Addis Sefer"},{"OurBranchID":"2354","BranchName":"Kotebe College"},{"OurBranchID":"2355","BranchName":"Bihere Tsigie"},{"OurBranchID":"2356","BranchName":"Akaki Alem Bank"},{"OurBranchID":"2357","BranchName":"Figa"},{"OurBranchID":"2358","BranchName":"Kara"},{"OurBranchID":"2359","BranchName":"Arba Minch"},{"OurBranchID":"2360","BranchName":"Hossana"},{"OurBranchID":"2361","BranchName":"Legetafo"},{"OurBranchID":"2362","BranchName":"Sebeta"},{"OurBranchID":"2363","BranchName":"Shashemene"},{"OurBranchID":"2364","BranchName":"Wolayta Sodo"},{"OurBranchID":"2365","BranchName":"Dilla"},{"OurBranchID":"2366","BranchName":"Tabor"},{"OurBranchID":"2367","BranchName":"Yirga Cheffe"},{"OurBranchID":"2368","BranchName":"Bisrate Gebriel"},{"OurBranchID":"2369","BranchName":"Jemo Michael"},{"OurBranchID":"2370","BranchName":"Mikililand"},{"OurBranchID":"2371","BranchName":"Moenco"},{"OurBranchID":"2372","BranchName":"Semien Mazegaja"},{"OurBranchID":"2373","BranchName":"Saris Abo"},{"OurBranchID":"2374","BranchName":"Sululta"},{"OurBranchID":"2375","BranchName":"Bonga"},{"OurBranchID":"2376","BranchName":"Jimma"},{"OurBranchID":"2377","BranchName":"Gerji Roba"},{"OurBranchID":"2378","BranchName":"Gambela"},{"OurBranchID":"2379","BranchName":"Mizan Aman"},{"OurBranchID":"2380","BranchName":"Dimma Akobo"},{"OurBranchID":"2381","BranchName":"Merkato Satin Tera"},{"OurBranchID":"2382","BranchName":"Garment Sefera"},{"OurBranchID":"2383","BranchName":"Lam Beret"},{"OurBranchID":"2384","BranchName":"Goro Sefera"},{"OurBranchID":"2385","BranchName":"Megenagna Square"},{"OurBranchID":"2386","BranchName":"Gojjam Berenda"},{"OurBranchID":"2387","BranchName":"Butajira"},{"OurBranchID":"2388","BranchName":"Bole Arabsa"},{"OurBranchID":"2389","BranchName":"Sidamo Tera"},{"OurBranchID":"2390","BranchName":"Jigjiga"},{"OurBranchID":"2401","BranchName":"Hormat"},{"OurBranchID":"2501","BranchName":"Yifat"},{"OurBranchID":"2601","BranchName":"Sebatu Warka"},{"OurBranchID":"2701","BranchName":"Damot"},{"OurBranchID":"2801","BranchName":"Burie Damot"},{"OurBranchID":"2901","BranchName":"Chagni"},{"OurBranchID":"3001","BranchName":"Danegila"},{"OurBranchID":"3101","BranchName":"Woreta"},{"OurBranchID":"3301","BranchName":"Debre Roha"},{"OurBranchID":"3401","BranchName":"Kemissie"},{"OurBranchID":"3501","BranchName":"Batti"},{"OurBranchID":"3601","BranchName":"Yilmana Densa"},{"OurBranchID":"3701","BranchName":"Qoga"},{"OurBranchID":"3801","BranchName":"Dejazmach H/Eyesus Filatie"},{"OurBranchID":"3901","BranchName":"Gojjam Ber"},{"OurBranchID":"4001","BranchName":"Belay Zeleke"},{"OurBranchID":"4101","BranchName":"Aleme Ketema"},{"OurBranchID":"4201","BranchName":"Mehal Meda"},{"OurBranchID":"4301","BranchName":"Efeson"},{"OurBranchID":"4401","BranchName":"Lego Haik"},{"OurBranchID":"4501","BranchName":"Mekaneselam"},{"OurBranchID":"4601","BranchName":"Abageteye"},{"OurBranchID":"4701","BranchName":"Addiszemen"},{"OurBranchID":"4801","BranchName":"Ras Gayint"},{"OurBranchID":"4901","BranchName":"Mekaneyesus"},{"OurBranchID":"5001","BranchName":"Aykel"},{"OurBranchID":"5101","BranchName":"Arerti"},{"OurBranchID":"5201","BranchName":"Meket"},{"OurBranchID":"5301","BranchName":"Tana"},{"OurBranchID":"5401","BranchName":"Azezo"},{"OurBranchID":"5501","BranchName":"Tossa"},{"OurBranchID":"5502","BranchName":"Woizero Siheen"},{"OurBranchID":"5601","BranchName":"Gonder Ber"},{"OurBranchID":"6701","BranchName":"Bahir Dar  District"},{"OurBranchID":"6702","BranchName":"Sefen-Selam"},{"OurBranchID":"6703","BranchName":"Dagemawi Menelik"},{"OurBranchID":"6704","BranchName":"Finote"},{"OurBranchID":"6705","BranchName":"Gordema"},{"OurBranchID":"6706","BranchName":"Dengel"},{"OurBranchID":"6707","BranchName":"Zenzelma"},{"OurBranchID":"6708","BranchName":"Lideta"},{"OurBranchID":"6709","BranchName":"Abay Dar"},{"OurBranchID":"6710","BranchName":"Selam Ber"},{"OurBranchID":"6711","BranchName":"Abay Ena Tana"},{"OurBranchID":"6801","BranchName":"Gendeuha District"},{"OurBranchID":"6802","BranchName":"Dansha"},{"OurBranchID":"6803","BranchName":"Wef Argif"},{"OurBranchID":"6804","BranchName":"Dubaba"},{"OurBranchID":"6805","BranchName":"Humera"},{"OurBranchID":"6806","BranchName":"Maksegno Gebeya"}];

const sessionData = {
  BankID: localStorage.getItem('BankID') || '00',
  OurBranchID: localStorage.getItem('BranchID') || '0101',
  OperatorID: localStorage.getItem('OperatorID') || 'SYS'
};

document.addEventListener('DOMContentLoaded', function () {
  initializeGLBranchDetailsHandlers();
  initServices();
  // Set default branch description for 0101
  setDefaultBranchDescription();
  // Load previously added accounts from database
  loadAddedAccountsFromDatabase();
});

/**
 * Initialize services
 */
async function initServices() {
  try {
    console.log('[GL Branch Details] Loading services...');
    
    if (!window.ServiceLoader) {
      console.error('ServiceLoader not found');
      return false;
    }

    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadGeneralLedgerService();
    
    GeneralLedgerService = window.GeneralLedgerService;
    
    if (!GeneralLedgerService) {
      console.error('GeneralLedgerService not found');
      return false;
    }
    
    console.log('[GL Branch Details] Services loaded successfully');
    return true;
  } catch (error) {
    console.error('[GL Branch Details] Error loading services:', error);
    return false;
  }
}

function initializeGLBranchDetailsHandlers() {
  console.log('[GL Branch Details] Initializing handlers...');
  
  // DataEntry Button and Submenu Handlers
  const dataEntryBtn = document.getElementById('dataEntryBtn');
  const dataEntrySubmenu = document.getElementById('dataEntrySubmenu');
  
  console.log('[GL Branch Details] dataEntryBtn:', dataEntryBtn);
  console.log('[GL Branch Details] dataEntrySubmenu:', dataEntrySubmenu);
  
  dataEntryBtn.addEventListener('click', function () {
    toggleDataEntrySubmenu();
  });

  const submenuItems = document.querySelectorAll('.gbd-submenu-item');
  submenuItems.forEach(item => {
    item.addEventListener('click', function () {
      const action = this.getAttribute('data-action');
      if (action === 'blocking-unblocking') {
        openBlockingUnblockingModal();
      } else if (action === 'cheque-book') {
        openChequeBookModal();
      } else if (action === 'stop-payment') {
        openStopPaymentModal();
      } else if (action === 'cancel-stop') {
        openCancelStopModal();
      }
      hideDataEntrySubmenu();
    });
    
    item.addEventListener('mouseenter', function () {
      this.style.backgroundColor = '#f0f9ff';
      this.style.color = '#5b9fd9';
    });
    
    item.addEventListener('mouseleave', function () {
      this.style.backgroundColor = 'white';
      this.style.color = '#1f2937';
    });
  });

  // Close submenu when clicking outside
  document.addEventListener('click', function (e) {
    if (!dataEntryBtn.contains(e.target) && !dataEntrySubmenu.contains(e.target)) {
      hideDataEntrySubmenu();
    }
  });

  // Action Button Handlers
  document.getElementById('closeBtn').addEventListener('click', function () {
    closeGLBranchDetails();
  });

  document.getElementById('viewBtn').addEventListener('click', function () {
    viewGLBranchDetails();
  });

  document.getElementById('addBtn').addEventListener('click', function () {
    addNewGLBranchDetails();
  });

  document.getElementById('saveBtn').addEventListener('click', function () {
    saveGLBranchDetails();
  });

  document.getElementById('cancelBtn').addEventListener('click', function () {
    cancelGLBranchDetails();
  });

  document.getElementById('viewSelect').addEventListener('change', function () {
    onViewChanged();
  });

  // Checkbox Handler
  document.getElementById('doRevaluationCheckbox').addEventListener('change', function () {
    onDoRevaluationChanged();
  });

  // Branch ID input handler
  document.getElementById('branchIdField').addEventListener('change', function () {
    onBranchIdChanged();
  });

  // Account ID input handler - auto-load data when Account ID is entered
  document.getElementById('accountIdField').addEventListener('blur', function () {
    const accountId = this.value.trim();
    const branchId = document.getElementById('branchIdField').value.trim();
    if (accountId && branchId) {
      console.log('[GL Branch Details] Account ID changed, loading data...');
      loadGLBranchData(branchId, accountId);
    }
  });

  // Branch search button handler
  const branchSearchBtn = document.querySelector('.btn-lookup-branch');
  console.log('[GL Branch Details] Branch search button found:', branchSearchBtn);
  if (branchSearchBtn) {
    branchSearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[GL Branch Details] Branch search button clicked!');
      showBranchSearchModal();
    });
    console.log('[GL Branch Details] Branch search button event listener attached');
  } else {
    console.error('[GL Branch Details] Branch search button NOT found!');
  }

  // Account ID search button handler
  const accountSearchBtn = document.querySelector('.btn-lookup-account');
  console.log('[GL Branch Details] Account search button found:', accountSearchBtn);
  if (accountSearchBtn) {
    accountSearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[GL Branch Details] Account search button clicked!');
      showAccountSearchModal();
    });
    console.log('[GL Branch Details] Account search button event listener attached');
  } else {
    console.error('[GL Branch Details] Account search button NOT found!');
  }
}

// Action Functions
function closeGLBranchDetails() {
  console.log('Closing GL Branch Details...');
  if (window.parent && window.parent.closeModal) {
    window.parent.closeModal('glBranchDetailsModal');
  }
}

function viewGLBranchDetails() {
  console.log('Viewing GL Branch Details record...');
  isAddMode = false; // Reset to view mode
  const branchId = document.getElementById('branchIdField').value.trim();
  const accountId = document.getElementById('accountIdField').value.trim();
  
  if (!branchId) {
    alert('Please enter a Branch ID first');
    return;
  }
  
  if (!accountId) {
    alert('Please enter an Account ID first');
    return;
  }
  
  // Load the GL branch data
  loadGLBranchData(branchId, accountId);
}

async function addNewGLBranchDetails() {
  console.log('Adding new GL Branch Details record...');
  isAddMode = true; // Enable add mode
  clearForm();
  enableFormFields();
  
  // Set default branch to 0101 with Head Office description
  document.getElementById('branchIdField').value = '0101';
  document.getElementById('headOfficeField').value = 'Head Office';
  
  // Disable Save and Cancel buttons until data is loaded
  document.getElementById('saveBtn').disabled = true;
  document.getElementById('cancelBtn').disabled = true;
  
  // Focus on Account ID field
  document.getElementById('accountIdField').focus();
}

async function saveGLBranchDetails() {
  console.log('Saving GL Branch Details record...');
  
  // Validate required fields
  const branchId = document.getElementById('branchIdField').value.trim();
  const accountId = document.getElementById('accountIdField').value.trim();
  
  if (!branchId) {
    alert('Branch ID is required');
    return;
  }
  
  if (!accountId) {
    alert('Account ID is required');
    return;
  }

  // If in add mode, call the add API
  if (isAddMode) {
    // Ensure service is loaded
    if (!GeneralLedgerService) {
      console.log('[GL Branch Details] GeneralLedgerService not loaded, initializing...');
      await initServices();
    }
    
    if (!GeneralLedgerService) {
      console.error('[GL Branch Details] GeneralLedgerService not available');
      alert('Service not available. Please try again.');
      return;
    }
    
    try {
      // Prepare request data
      const now = new Date();
      const dateTimeString = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const requestData = {
        OurBranchID: branchId,
        AccountID: accountId,
        BankID: sessionData.BankID,
        CreatedBy: sessionData.OperatorID,
        CreatedOn: dateTimeString,
        SupervisedBy: sessionData.OperatorID
      };
      
      console.log('[GL Branch Details] ============ SAVE REQUEST ============');
      console.log('[GL Branch Details] Request Data:', JSON.stringify(requestData, null, 2));
      console.log('[GL Branch Details] ========================================');
      
      const result = await GeneralLedgerService.addGLBranches(requestData);
      
      console.log('[GL Branch Details] ============ SAVE RESPONSE ============');
      console.log('[GL Branch Details] Response:', JSON.stringify(result, null, 2));
      console.log('[GL Branch Details] Success:', result.success);
      console.log('[GL Branch Details] Code:', result.code);
      console.log('[GL Branch Details] Message:', result.message);
      console.log('[GL Branch Details] ========================================');
      
      if (result.success || result.code === '00') {
        // Store the added account for later retrieval
        addedAccounts.push({
          OurBranchID: branchId,
          AccountID: accountId
        });
        console.log('[GL Branch Details] Stored added account. Total added:', addedAccounts.length);
        
        alert(`GL Branch added successfully!\n\nBranch: ${branchId}\nAccount: ${accountId}\n\nThis account should now appear in the "GL Branch" modal when searching with Branch ID: ${branchId}`);
        // Reset to normal mode
        isAddMode = false;
        // Clear the form
        clearForm();
        disableFormFields();
        // Disable Save and Cancel buttons
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('cancelBtn').disabled = true;
      } else {
        alert('Failed to add GL Branch: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('[GL Branch Details] Error adding GL Branch:', err);
      alert('Error adding GL Branch: ' + (err.message || err));
    }
  } else {
    // Normal update mode (if needed in future)
    alert('Update functionality not yet implemented');
  }
}

function cancelGLBranchDetails() {
  console.log('Cancelling GL Branch Details operation...');
  isAddMode = false; // Reset add mode
  clearForm();
  disableFormFields();
  
  // Disable Save and Cancel buttons
  document.getElementById('saveBtn').disabled = true;
  document.getElementById('cancelBtn').disabled = true;
}

// DataEntry Submenu Functions
function toggleDataEntrySubmenu() {
  const submenu = document.getElementById('dataEntrySubmenu');
  if (submenu.style.display === 'none' || submenu.style.display === '') {
    submenu.style.display = 'block';
  } else {
    submenu.style.display = 'none';
  }
}

function hideDataEntrySubmenu() {
  const submenu = document.getElementById('dataEntrySubmenu');
  submenu.style.display = 'none';
}

function hideDataEntrySubmenu() {
  const submenu = document.getElementById('dataEntrySubmenu');
  submenu.style.display = 'none';
}

function openBlockingUnblockingModal() {
  console.log('Opening Blocking/Unblocking modal...');
  
  try {
    // Get the parent modal element
    const parentModal = window.parent.document.getElementById('glBranchDetailsModal');
    
    // Keep parent modal visible using MutationObserver
    if (parentModal) {
      parentModal.style.zIndex = '1040';
      
      const observer = new MutationObserver(() => {
        if (!parentModal.classList.contains('show')) {
          parentModal.classList.add('show');
        }
        if (parentModal.style.display === 'none' || !parentModal.style.display) {
          parentModal.style.display = 'block';
        }
      });
      
      observer.observe(parentModal, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      // Store observer to disconnect later if needed
      parentModal._keepVisibleObserver = observer;
    }
    
    // Get the nested modal element
    const nestedModalElement = window.parent.document.getElementById('glBranchDetailsBlockingUnblockingModal');
    if (nestedModalElement) {
      nestedModalElement.style.zIndex = '1060';
      
      // Create or get the Bootstrap modal instance with backdrop disabled
      const bootstrapModal = window.parent.bootstrap.Modal.getOrCreateInstance(nestedModalElement, {
        backdrop: false
      });
      
      bootstrapModal.show();
    }
  } catch (e) {
    console.log('Error opening Blocking/Unblocking modal:', e);
  }
}

function openChequeBookModal() {
  console.log('Opening GL - Cheque Book modal...');
  
  try {
    // Get the parent modal element
    const parentModal = window.parent.document.getElementById('glBranchDetailsModal');
    
    // Get Account ID from main form - try iframe context first, then parent
    let accountIdField = document.getElementById('accountIdField');
    let branchIdField = document.getElementById('branchIdField');
    
    // If not found in current context, try parent
    if (!accountIdField) {
      accountIdField = window.parent.document.getElementById('accountIdField');
    }
    if (!branchIdField) {
      branchIdField = window.parent.document.getElementById('branchIdField');
    }
    
    const accountId = accountIdField ? accountIdField.value : '';
    const branchId = branchIdField ? branchIdField.value : '';
    
    // Get account type and category from the account data (stored when account is selected)
    const accountTypeID = accountIdField ? accountIdField.dataset.accountType || '' : '';
    const categoryID = accountIdField ? accountIdField.dataset.category || '' : '';
    
    console.log('AccountIdField element:', accountIdField);
    console.log('AccountIdField value:', accountId);
    console.log('BranchIdField element:', branchIdField);
    console.log('BranchIdField value:', branchId);
    
    // Keep parent modal visible using MutationObserver
    if (parentModal) {
      parentModal.style.zIndex = '1040';
      
      const observer = new MutationObserver(() => {
        if (!parentModal.classList.contains('show')) {
          parentModal.classList.add('show');
        }
        if (parentModal.style.display === 'none' || !parentModal.style.display) {
          parentModal.style.display = 'block';
        }
      });
      
      observer.observe(parentModal, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      parentModal._keepVisibleObserver = observer;
    }
    
    // Get the nested modal element
    const nestedModalElement = window.parent.document.getElementById('glBranchDetailsChequeBookModal');
    if (nestedModalElement) {
      nestedModalElement.style.zIndex = '1060';
      
      // Get the iframe
      const iframe = nestedModalElement.querySelector('iframe');
      if (iframe) {
        // Function to set the account ID in iframe
        const setIframeData = () => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow && typeof iframeWindow.setAccountId === 'function') {
              iframeWindow.setAccountId(accountId, branchId, accountTypeID, categoryID);
              console.log('Successfully set Account ID in iframe with type:', accountTypeID, 'and category:', categoryID);
            } else {
              console.log('setAccountId function not available yet');
            }
          } catch (err) {
            console.log('Error setting account ID:', err);
          }
        };
        
        // Try multiple approaches to ensure data is set
        // 1. If iframe is already loaded
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
          setIframeData();
        }
        
        // 2. Set on iframe load
        iframe.addEventListener('load', setIframeData);
        
        // 3. Also try after a short delay (fallback)
        setTimeout(setIframeData, 100);
        setTimeout(setIframeData, 500);
      }
      
      // Create or get the Bootstrap modal instance with backdrop disabled
      const bootstrapModal = window.parent.bootstrap.Modal.getOrCreateInstance(nestedModalElement, {
        backdrop: false
      });
      
      bootstrapModal.show();
    }
  } catch (e) {
    console.log('Error opening GL - Cheque Book modal:', e);
  }
}

function openStopPaymentModal() {
  console.log('Opening GL - Stop Payment/Void modal...');
  
  try {
    // Get the parent modal element
    const parentModal = window.parent.document.getElementById('glBranchDetailsModal');
    
    // Get Account ID from main form - try iframe context first, then parent
    let accountIdField = document.getElementById('accountIdField');
    let branchIdField = document.getElementById('branchIdField');
    
    // If not found in current context, try parent
    if (!accountIdField) {
      accountIdField = window.parent.document.getElementById('accountIdField');
    }
    if (!branchIdField) {
      branchIdField = window.parent.document.getElementById('branchIdField');
    }
    
    const accountId = accountIdField ? accountIdField.value : '';
    const branchId = branchIdField ? branchIdField.value : '';
    
    console.log('AccountIdField element:', accountIdField);
    console.log('AccountIdField value:', accountId);
    console.log('BranchIdField element:', branchIdField);
    console.log('BranchIdField value:', branchId);
    
    // Keep parent modal visible using MutationObserver
    if (parentModal) {
      parentModal.style.zIndex = '1040';
      
      const observer = new MutationObserver(() => {
        if (!parentModal.classList.contains('show')) {
          parentModal.classList.add('show');
        }
        if (parentModal.style.display === 'none' || !parentModal.style.display) {
          parentModal.style.display = 'block';
        }
      });
      
      observer.observe(parentModal, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      parentModal._keepVisibleObserver = observer;
    }
    
    // Get the nested modal element
    const nestedModalElement = window.parent.document.getElementById('glBranchDetailsStopPaymentModal');
    if (nestedModalElement) {
      nestedModalElement.style.zIndex = '1060';
      
      // Get the iframe
      const iframe = nestedModalElement.querySelector('iframe');
      if (iframe) {
        // Function to set the account ID in iframe
        const setIframeData = () => {
          try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow && typeof iframeWindow.setAccountId === 'function') {
              iframeWindow.setAccountId(accountId, branchId);
              console.log('Successfully set Account ID in Stop Payment iframe:', accountId, branchId);
            } else {
              console.log('setAccountId function not available yet');
            }
          } catch (err) {
            console.log('Error setting account ID:', err);
          }
        };
        
        // Try multiple approaches to ensure data is set
        // 1. If iframe is already loaded
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
          setIframeData();
        }
        
        // 2. Set on iframe load
        iframe.addEventListener('load', setIframeData);
        
        // 3. Also try after a short delay (fallback)
        setTimeout(setIframeData, 100);
        setTimeout(setIframeData, 500);
      }
      
      // Create or get the Bootstrap modal instance with backdrop disabled
      const bootstrapModal = window.parent.bootstrap.Modal.getOrCreateInstance(nestedModalElement, {
        backdrop: false
      });
      
      bootstrapModal.show();
    }
  } catch (e) {
    console.log('Error opening GL - Stop Payment/Void modal:', e);
  }
}

function openCancelStopModal() {
  console.log('Opening GL - Cancel Stop modal...');
  
  try {
    // Get the parent modal element
    const parentModal = window.parent.document.getElementById('glBranchDetailsModal');
    
    // Keep parent modal visible using MutationObserver
    if (parentModal) {
      parentModal.style.zIndex = '1040';
      
      const observer = new MutationObserver(() => {
        if (!parentModal.classList.contains('show')) {
          parentModal.classList.add('show');
        }
        if (parentModal.style.display === 'none' || !parentModal.style.display) {
          parentModal.style.display = 'block';
        }
      });
      
      observer.observe(parentModal, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      parentModal._keepVisibleObserver = observer;
    }
    
    // Get the nested modal element
    const nestedModalElement = window.parent.document.getElementById('glBranchDetailsCancelStopModal');
    if (nestedModalElement) {
      nestedModalElement.style.zIndex = '1060';
      
      // Create or get the Bootstrap modal instance with backdrop disabled
      const bootstrapModal = window.parent.bootstrap.Modal.getOrCreateInstance(nestedModalElement, {
        backdrop: false
      });
      
      bootstrapModal.show();
    }
  } catch (e) {
    console.log('Error opening GL - Cancel Stop modal:', e);
  }
}

// Dropdown Change Handlers
function onViewChanged() {
  const selectedOption = document.getElementById('viewSelect').value;
  console.log('View changed to:', selectedOption);
  // Implement View logic
}

function onBranchIdChanged() {
  const branchId = document.getElementById('branchIdField').value.trim();
  console.log('Branch ID changed to:', branchId);
  
  // Update the head office/branch name field
  const branch = allBranches.find(b => b.OurBranchID === branchId);
  if (branch) {
    document.getElementById('headOfficeField').value = branch.BranchName;
  } else {
    document.getElementById('headOfficeField').value = '';
  }
}

function onGLTypeChanged() {
  const glType = document.getElementById('glTypeSelect').value;
  console.log('GL Type changed to:', glType);
  populateGLSubTypeGroups(glType);
}

function onGLSubTypeGroupChanged() {
  const glSubTypeGroup = document.getElementById('glSubTypeGroupSelect').value;
  console.log('GL Sub Type Group changed to:', glSubTypeGroup);
  populateGLSubTypes(glSubTypeGroup);
}

function onDoRevaluationChanged() {
  const isChecked = document.getElementById('doRevaluationCheckbox').checked;
  console.log('Do Revaluation checkbox changed to:', isChecked);
}

// Form Management Functions
function clearForm() {
  document.getElementById('branchIdField').value = '0101';
  document.getElementById('headOfficeField').value = 'Head Office';
  document.getElementById('accountIdField').value = '';
  document.getElementById('accountNameField').value = '';
  document.getElementById('shortNameField').value = '';
  document.getElementById('currencyIdField').value = '';
  document.getElementById('currencyNameField').value = '';
  document.getElementById('mainAccountIdField').value = '';
  document.getElementById('glTypeField').value = '';
  document.getElementById('glSubTypeGroupField').value = '';
  document.getElementById('glSubTypeField').value = '';
  document.getElementById('glCategoryField').value = '';
  document.getElementById('postingTypeField').value = '';
  document.getElementById('glClassField').value = '';
  document.getElementById('contraAccountIdField').value = '';
  document.getElementById('doRevaluationCheckbox').checked = false;
  document.getElementById('remarksField').value = '';
  
  // Clear Behind The Scene fields
  clearBehindTheSceneFields();
}

function clearBehindTheSceneFields() {
  document.getElementById('openingBalanceField').value = '';
  document.getElementById('openingForeignBalanceField').value = '';
  document.getElementById('balanceField').value = '';
  document.getElementById('foreignBalanceField').value = '';
  document.getElementById('closedOnField').value = '';
  document.getElementById('rateField').value = '';
  document.getElementById('isBlockedCheckbox').checked = false;
  document.getElementById('meanRateField').value = '';
  document.getElementById('createdByField').value = '';
  document.getElementById('supervisedByField').value = '';
  document.getElementById('createdOnField').value = '';
  document.getElementById('supervisedOnField').value = '';
}

function getFormData() {
  return {
    branchId: document.getElementById('branchIdField').value,
    headOffice: document.getElementById('headOfficeField').value,
    accountId: document.getElementById('accountIdField').value,
    shortName: document.getElementById('shortNameField').value,
    currencyId: document.getElementById('currencyIdField').value,
    mainAccountId: document.getElementById('mainAccountIdField').value,
    glType: document.getElementById('glTypeField').value,
    glSubTypeGroup: document.getElementById('glSubTypeGroupField').value,
    glSubType: document.getElementById('glSubTypeField').value,
    glCategory: document.getElementById('glCategoryField').value,
    postingType: document.getElementById('postingTypeField').value,
    glClass: document.getElementById('glClassField').value,
    contraAccountId: document.getElementById('contraAccountIdField').value,
    doRevaluation: document.getElementById('doRevaluationCheckbox').checked,
    remarks: document.getElementById('remarksField').value
  };
}

function setDefaultBranchDescription() {
  const branchIdField = document.getElementById('branchIdField');
  const headOfficeField = document.getElementById('headOfficeField');
  
  if (branchIdField && headOfficeField) {
    const branchId = branchIdField.value.trim();
    const branch = allBranches.find(b => b.OurBranchID === branchId);
    if (branch) {
      headOfficeField.value = branch.BranchName;
      console.log('[GL Branch Details] Set default branch description:', branch.BranchName);
    }
  }
}

async function loadAddedAccountsFromDatabase() {
  console.log('[GL Branch Details] Loading previously added accounts from database...');
  
  // Wait for services to load
  let retries = 0;
  while (!GeneralLedgerService && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }
  
  if (!GeneralLedgerService) {
    console.warn('[GL Branch Details] Service not available, skipping database load');
    return;
  }
  
  try {
    // Get all branches to check
    const branches = allBranches.map(b => b.OurBranchID);
    
    for (const branchId of branches) {
      try {
        // Query GLBranch table
        const tableResult = await GeneralLedgerService.getSearchResult({
          TableID: 'GLBranch',
          AdvFilterString: `OurBranchID='${branchId}'`,
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: '',
          OperatorID: sessionData.OperatorID,
          ModuleID: 8020,
          OurBranchID: sessionData.OurBranchID,
          SearchKey: '',
          LanguageID: 'en'
        });
        
        // Get accounts from GLBranch
        let tableAccounts = [];
        if (tableResult.data?.Details) {
          tableAccounts = tableResult.data.Details;
        } else if (tableResult.Details) {
          tableAccounts = tableResult.Details;
        }
        
        // Query GLBranchID view
        const viewResult = await GeneralLedgerService.getSearchResult({
          TableID: 'GLBranchID',
          AdvFilterString: `OurBranchID='${branchId}'`,
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: '',
          OperatorID: sessionData.OperatorID,
          ModuleID: 8020,
          OurBranchID: sessionData.OurBranchID,
          SearchKey: '',
          LanguageID: 'en'
        });
        
        // Get accounts from view
        let viewAccounts = [];
        if (viewResult.data?.Details) {
          viewAccounts = viewResult.data.Details;
        } else if (viewResult.Details) {
          viewAccounts = viewResult.Details;
        }
        
        // Find accounts in GLBranch but not in GLBranchID (these are manually added)
        const viewAccountIds = new Set(viewAccounts.map(a => a.AccountID));
        const manuallyAdded = tableAccounts
          .filter(a => !viewAccountIds.has(a.AccountID))
          .map(a => ({
            OurBranchID: branchId,
            AccountID: a.AccountID
          }));
        
        addedAccounts.push(...manuallyAdded);
      } catch (err) {
        console.warn('[GL Branch Details] Error loading accounts for branch', branchId, err);
      }
    }
    
    console.log('[GL Branch Details] Loaded', addedAccounts.length, 'previously added accounts from database');
  } catch (err) {
    console.error('[GL Branch Details] Error loading added accounts:', err);
  }
}

function enableFormFields() {
  const fields = document.querySelectorAll('.gbd-container .form-control:not([readonly]), .gbd-container .form-select:not([disabled])');
  fields.forEach(field => {
    field.disabled = false;
  });
}

function disableFormFields() {
  const fields = document.querySelectorAll('.gbd-container .form-control:not([readonly]), .gbd-container .form-select:not([disabled])');
  fields.forEach(field => {
    if (field.id !== 'branchIdField' && field.id !== 'accountIdField') {
      field.disabled = true;
    }
  });
}

// Data Loading Functions
function loadBranchDetails(branchId) {
  console.log('Loading branch details for:', branchId);
  // This would typically call an API to fetch branch details
  // For now, we'll just populate some example data
  
  // Example data - replace with actual API call
  const exampleData = {
    branchId: branchId,
    headOffice: 'Main Office',
    accountId: '1001',
    shortName: 'BO',
    currencyId: 'USD',
    mainAccountId: '1000',
    glType: 'Asset',
    glSubTypeGroup: 'STGR001',
    glSubType: 'ST001',
    glCategory: 'Active',
    postingType: 'Daily',
    glClass: 'Balance Sheet',
    contraAccountId: '1002',
    doRevaluation: false,
    remarks: 'Main branch GL details',
    openingBalance: '1000000.00',
    openingForeignBalance: '50000.00',
    balance: '1000000.00',
    foreignBalance: '50000.00',
    closedOn: '',
    rate: '20.00',
    isBlocked: false,
    meanRate: '20.00',
    createdBy: 'ADMIN',
    supervisedBy: 'MANAGER',
    createdOn: '2024-01-01',
    supervisedOn: '2024-01-02'
  };
  
  populateFormData(exampleData);
  disableFormFields();
}

async function loadGLBranchData(branchId, accountId) {
  console.log('[GL Branch Details] Loading GL branch data for Branch:', branchId, 'Account:', accountId);
  
  // Ensure service is loaded
  if (!GeneralLedgerService) {
    console.log('[GL Branch Details] GeneralLedgerService not loaded, initializing...');
    await initServices();
  }
  
  if (!GeneralLedgerService) {
    console.error('[GL Branch Details] GeneralLedgerService not available');
    alert('Service not available. Please try again.');
    return;
  }
  
  if (typeof GeneralLedgerService.getGLBranches !== 'function') {
    console.error('[GL Branch Details] getGLBranches method not found on GeneralLedgerService');
    alert('getGLBranches method not available');
    return;
  }
  
  try {
    console.log('[GL Branch Details] Calling getGLBranches with params:', {
      OurBranchID: branchId,
      AccountID: accountId,
      OperatorID: sessionData.OperatorID,
      Direction: 0
    });
    
    const result = await GeneralLedgerService.getGLBranches({
      OurBranchID: branchId,
      AccountID: accountId,
      OperatorID: sessionData.OperatorID,
      Direction: 0
    });
    
    console.log('[GL Branch Details] API Response:', result);
    
    // Parse response - check Details, Details01, Details02
    let glData = null;
    
    // Try Details01 first (usually contains the main GL branch record)
    if (result.data && result.data.Details01 && result.data.Details01.length > 0) {
      glData = result.data.Details01[0];
      console.log('[GL Branch Details] Found data in Details01');
    } else if (result.Details01 && result.Details01.length > 0) {
      glData = result.Details01[0];
      console.log('[GL Branch Details] Found data in Details01');
    }
    // Try Details02 (might contain additional info)
    else if (result.data && result.data.Details02 && result.data.Details02.length > 0) {
      glData = result.data.Details02[0];
      console.log('[GL Branch Details] Found data in Details02');
    } else if (result.Details02 && result.Details02.length > 0) {
      glData = result.Details02[0];
      console.log('[GL Branch Details] Found data in Details02');
    }
    // Fallback to Details
    else if (result.data && result.data.Details && result.data.Details.length > 0) {
      glData = result.data.Details[0];
      console.log('[GL Branch Details] Found data in Details');
    } else if (result.Details && result.Details.length > 0) {
      glData = result.Details[0];
      console.log('[GL Branch Details] Found data in Details');
    } else if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      glData = result.data;
      console.log('[GL Branch Details] Found data in result.data object');
    }
    
    if (glData) {
      console.log('[GL Branch Details] Found GL data:', glData);
      populateFormDataFromAPI(glData);
      
      // Enable Save and Cancel buttons if in add mode
      if (isAddMode) {
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('cancelBtn').disabled = false;
      }
      
      console.log('[GL Branch Details] GL Branch data loaded successfully');
    } else {
      console.warn('[GL Branch Details] No data found for Branch:', branchId, 'Account:', accountId);
      console.log('[GL Branch Details] Full response:', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error('[GL Branch Details] Error loading GL branch data:', err);
    alert('Error loading data: ' + (err.message || err));
  }
}

function populateFormDataFromAPI(data) {
  console.log('[GL Branch Details] Populating form from API data:', data);
  console.log('[GL Branch Details] Available field names:', Object.keys(data));
  
  // Map API response fields to form fields
  // Branch details (keep existing values, don't overwrite)
  // if (data.OurBranchID) document.getElementById('branchIdField').value = data.OurBranchID;
  // if (data.BranchName) document.getElementById('headOfficeField').value = data.BranchName;
  if (data.AccountID) document.getElementById('accountIdField').value = data.AccountID;
  if (data.ShortName) document.getElementById('accountNameField').value = data.ShortName;
  
  // GL Branch Details
  if (data.ShortName) document.getElementById('shortNameField').value = data.ShortName;
  if (data.CurrencyID) document.getElementById('currencyIdField').value = data.CurrencyID;
  if (data.CurrencyName) document.getElementById('currencyNameField').value = data.CurrencyName;
  if (data.MainGLAccountID) document.getElementById('mainAccountIdField').value = data.MainGLAccountID;
  
  // GL Type fields
  if (data.GLAccountType) document.getElementById('glTypeField').value = data.GLAccountType;
  if (data.GLSubTypeGroup) document.getElementById('glSubTypeGroupField').value = data.GLSubTypeGroup;
  if (data.GLSubAccountType) document.getElementById('glSubTypeField').value = data.GLSubAccountType;
  if (data.GLCategory) document.getElementById('glCategoryField').value = data.GLCategory;
  if (data.PostingType) document.getElementById('postingTypeField').value = data.PostingType;
  if (data.GLClass) document.getElementById('glClassField').value = data.GLClass;
  
  if (data.ContraAccountID) document.getElementById('contraAccountIdField').value = data.ContraAccountID;
  if (data.IsRevaluate !== undefined) document.getElementById('doRevaluationCheckbox').checked = data.IsRevaluate;
  if (data.Remarks) document.getElementById('remarksField').value = data.Remarks;
  
  // Behind The Scene fields
  if (data.LocalOpeningBalance !== undefined) document.getElementById('openingBalanceField').value = data.LocalOpeningBalance;
  if (data.ForeignOpeningBalance !== undefined) document.getElementById('openingForeignBalanceField').value = data.ForeignOpeningBalance;
  if (data.LocalBalance !== undefined) document.getElementById('balanceField').value = data.LocalBalance;
  if (data.ForeignBalance !== undefined) document.getElementById('foreignBalanceField').value = data.ForeignBalance;
  if (data.ClosedDate) document.getElementById('closedOnField').value = data.ClosedDate;
  if (data.MeanRate !== undefined) document.getElementById('rateField').value = data.MeanRate;
  if (data.IsBlocked !== undefined) document.getElementById('isBlockedCheckbox').checked = data.IsBlocked;
  if (data.MeanRate !== undefined) document.getElementById('meanRateField').value = data.MeanRate;
  
  // Note: CreatedBy, SupervisedBy, CreatedOn, SupervisedOn are not in the API response
  console.log('[GL Branch Details] Form populated successfully');
}

function populateFormData(data) {
  document.getElementById('branchIdField').value = data.branchId || '';
  document.getElementById('headOfficeField').value = data.headOffice || '';
  document.getElementById('accountIdField').value = data.accountId || '';
  document.getElementById('shortNameField').value = data.shortName || '';
  document.getElementById('currencyIdField').value = data.currencyId || '';
  document.getElementById('mainAccountIdField').value = data.mainAccountId || '';
  document.getElementById('glTypeSelect').value = data.glType || '--Select--';
  document.getElementById('glSubTypeGroupSelect').value = data.glSubTypeGroup || '--Select--';
  document.getElementById('glSubTypeSelect').value = data.glSubType || '--Select--';
  document.getElementById('glCategorySelect').value = data.glCategory || '--Select--';
  document.getElementById('postingTypeSelect').value = data.postingType || '--Select--';
  document.getElementById('glClassSelect').value = data.glClass || '--Select--';
  document.getElementById('contraAccountIdField').value = data.contraAccountId || '';
  document.getElementById('doRevaluationCheckbox').checked = data.doRevaluation || false;
  document.getElementById('remarksField').value = data.remarks || '';
  
  // Populate Behind The Scene fields
  document.getElementById('openingBalanceField').value = data.openingBalance || '';
  document.getElementById('openingForeignBalanceField').value = data.openingForeignBalance || '';
  document.getElementById('balanceField').value = data.balance || '';
  document.getElementById('foreignBalanceField').value = data.foreignBalance || '';
  document.getElementById('closedOnField').value = data.closedOn || '';
  document.getElementById('rateField').value = data.rate || '';
  document.getElementById('isBlockedCheckbox').checked = data.isBlocked || false;
  document.getElementById('meanRateField').value = data.meanRate || '';
  document.getElementById('createdByField').value = data.createdBy || '';
  document.getElementById('supervisedByField').value = data.supervisedBy || '';
  document.getElementById('createdOnField').value = data.createdOn || '';
  document.getElementById('supervisedOnField').value = data.supervisedOn || '';
}

// Dropdown Population Functions
function populateGLSubTypeGroups(glType) {
  const select = document.getElementById('glSubTypeGroupSelect');
  while (select.options.length > 1) {
    select.remove(1);
  }
  if (glType && glType !== '--Select--') {
    const option = document.createElement('option');
    option.value = 'STGR001';
    option.text = 'Sub Type Group 1';
    select.appendChild(option);
  }
}

function populateGLSubTypes(glSubTypeGroup) {
  const select = document.getElementById('glSubTypeSelect');
  while (select.options.length > 1) {
    select.remove(1);
  }
  if (glSubTypeGroup && glSubTypeGroup !== '--Select--') {
    const option = document.createElement('option');
    option.value = 'ST001';
    option.text = 'Sub Type 1';
    select.appendChild(option);
  }
}

// Form Validation
function validateForm() {
  const branchId = document.getElementById('branchIdField').value.trim();
  const accountId = document.getElementById('accountIdField').value.trim();
  
  if (!branchId || !accountId) {
    alert('Please fill in all required fields');
    return false;
  }
  
  return true;
}

// Branch Search Modal Functions
async function showBranchSearchModal() {
  console.log('[GL Branch Details] showBranchSearchModal called');
  
  // Remove existing modal if present
  const existingModal = document.getElementById('branchSearchModal');
  if (existingModal) {
    console.log('[GL Branch Details] Removing existing modal');
    existingModal.remove();
  }
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'branchSearchModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10000';
  
  // Create modal content
  const content = document.createElement('div');
  content.style.background = 'white';
  content.style.borderRadius = '8px';
  content.style.width = '600px';
  content.style.maxHeight = '80vh';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  
  // Modal header with controls
  const header = document.createElement('div');
  header.style.background = '#517a8e';
  header.style.color = 'white';
  header.style.padding = '12px 20px';
  header.style.borderRadius = '8px 8px 0 0';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  const headerTitle = document.createElement('h3');
  headerTitle.textContent = 'Branch Search';
  headerTitle.style.margin = '0';
  headerTitle.style.fontSize = '15px';
  headerTitle.style.fontWeight = '600';
  
  const headerButtons = document.createElement('div');
  headerButtons.style.display = 'flex';
  headerButtons.style.gap = '8px';
  
  let isMinimized = false;
  let isMaximized = false;
  
  const minimizeBtn = document.createElement('button');
  minimizeBtn.innerHTML = '−';
  minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
  minimizeBtn.style.border = 'none';
  minimizeBtn.style.color = 'white';
  minimizeBtn.style.width = '32px';
  minimizeBtn.style.height = '32px';
  minimizeBtn.style.borderRadius = '4px';
  minimizeBtn.style.cursor = 'pointer';
  minimizeBtn.style.fontSize = '20px';
  minimizeBtn.onclick = function() {
    isMinimized = !isMinimized;
    body.style.display = isMinimized ? 'none' : 'block';
  };
  
  const maximizeBtn = document.createElement('button');
  maximizeBtn.innerHTML = '□';
  maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
  maximizeBtn.style.border = 'none';
  maximizeBtn.style.color = 'white';
  maximizeBtn.style.width = '32px';
  maximizeBtn.style.height = '32px';
  maximizeBtn.style.borderRadius = '4px';
  maximizeBtn.style.cursor = 'pointer';
  maximizeBtn.style.fontSize = '20px';
  maximizeBtn.onclick = function() {
    if (!isMaximized) {
      content.style.width = '95vw';
      content.style.maxHeight = '95vh';
      isMaximized = true;
    } else {
      content.style.width = '600px';
      content.style.maxHeight = '80vh';
      isMaximized = false;
    }
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.background = 'rgba(255,255,255,0.1)';
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'white';
  closeBtn.style.width = '32px';
  closeBtn.style.height = '32px';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '24px';
  closeBtn.onclick = function() { modal.remove(); };
  
  headerButtons.appendChild(minimizeBtn);
  headerButtons.appendChild(maximizeBtn);
  headerButtons.appendChild(closeBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);
  content.appendChild(header);
  
  // Modal body
  const body = document.createElement('div');
  body.style.padding = '24px';
  body.style.overflowY = 'auto';
  body.style.flex = '1';
  
  // Filter row
  const filterRow = document.createElement('div');
  filterRow.style.display = 'flex';
  filterRow.style.gap = '16px';
  filterRow.style.marginBottom = '16px';
  filterRow.style.alignItems = 'flex-end';
  
  // Branch ID column
  const idColumn = document.createElement('div');
  idColumn.style.display = 'flex';
  idColumn.style.flexDirection = 'column';
  idColumn.style.gap = '4px';
  
  const idLabel = document.createElement('label');
  idLabel.textContent = 'Branch ID';
  idLabel.style.fontSize = '12px';
  idLabel.style.fontWeight = '500';
  
  const idControls = document.createElement('div');
  idControls.style.display = 'flex';
  idControls.style.gap = '4px';
  
  const idType = document.createElement('select');
  idType.id = 'branchSearchIdType';
  idType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
  idType.style.height = '32px';
  idType.style.fontSize = '12px';
  idType.style.borderRadius = '4px';
  idType.style.border = '1px solid #d1d5db';
  idType.style.width = '80px';
  
  const idInput = document.createElement('input');
  idInput.id = 'branchSearchId';
  idInput.type = 'text';
  idInput.style.width = '140px';
  idInput.style.height = '32px';
  idInput.style.fontSize = '12px';
  idInput.style.padding = '6px 10px';
  idInput.style.borderRadius = '4px';
  idInput.style.border = '1px solid #d1d5db';
  
  idControls.appendChild(idType);
  idControls.appendChild(idInput);
  idColumn.appendChild(idLabel);
  idColumn.appendChild(idControls);
  
  // Branch Name column
  const nameColumn = document.createElement('div');
  nameColumn.style.display = 'flex';
  nameColumn.style.flexDirection = 'column';
  nameColumn.style.gap = '4px';
  
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Branch Name';
  nameLabel.style.fontSize = '12px';
  nameLabel.style.fontWeight = '500';
  
  const nameControls = document.createElement('div');
  nameControls.style.display = 'flex';
  nameControls.style.gap = '4px';
  
  const nameType = document.createElement('select');
  nameType.id = 'branchSearchNameType';
  nameType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
  nameType.style.height = '32px';
  nameType.style.fontSize = '12px';
  nameType.style.borderRadius = '4px';
  nameType.style.border = '1px solid #d1d5db';
  nameType.style.width = '80px';
  
  const nameInput = document.createElement('input');
  nameInput.id = 'branchSearchName';
  nameInput.type = 'text';
  nameInput.style.width = '140px';
  nameInput.style.height = '32px';
  nameInput.style.fontSize = '12px';
  nameInput.style.padding = '6px 10px';
  nameInput.style.borderRadius = '4px';
  nameInput.style.border = '1px solid #d1d5db';
  
  nameControls.appendChild(nameType);
  nameControls.appendChild(nameInput);
  nameColumn.appendChild(nameLabel);
  nameColumn.appendChild(nameControls);
  
  // Search button
  const searchBtn = document.createElement('button');
  searchBtn.textContent = 'Search';
  searchBtn.style.height = '32px';
  searchBtn.style.padding = '0 16px';
  searchBtn.style.fontSize = '12px';
  searchBtn.style.fontWeight = '500';
  searchBtn.style.background = '#517a8e';
  searchBtn.style.color = 'white';
  searchBtn.style.border = 'none';
  searchBtn.style.borderRadius = '4px';
  searchBtn.style.cursor = 'pointer';
  
  filterRow.appendChild(idColumn);
  filterRow.appendChild(nameColumn);
  filterRow.appendChild(searchBtn);
  body.appendChild(filterRow);
  
  // Results header
  const resultsHeader = document.createElement('div');
  resultsHeader.textContent = 'Search Results';
  resultsHeader.style.fontSize = '13px';
  resultsHeader.style.fontWeight = '600';
  resultsHeader.style.margin = '16px 0 8px 0';
  resultsHeader.style.paddingBottom = '8px';
  resultsHeader.style.borderBottom = '2px solid #f9b233';
  body.appendChild(resultsHeader);
  
  // Results table
  const table = document.createElement('table');
  table.id = 'branchSearchTable';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';
  table.innerHTML = `
    <thead>
      <tr style="background:#517a8e;color:#fff;">
        <th style="padding: 8px 12px; text-align: left;">Branch ID</th>
        <th style="padding: 8px 12px; text-align: left;">Branch Name</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  body.appendChild(table);
  
  // Navigation row
  const navRow = document.createElement('div');
  navRow.style.display = 'flex';
  navRow.style.justifyContent = 'center';
  navRow.style.gap = '16px';
  navRow.style.marginTop = '16px';
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.height = '32px';
  okBtn.style.padding = '0 24px';
  okBtn.style.fontSize = '12px';
  okBtn.style.fontWeight = '500';
  okBtn.style.background = '#22c55e';
  okBtn.style.color = 'white';
  okBtn.style.border = 'none';
  okBtn.style.borderRadius = '4px';
  okBtn.style.cursor = 'pointer';
  okBtn.onclick = function() {
    const selectedRow = table.querySelector('tbody tr.table-active');
    if (selectedRow) {
      const branchId = selectedRow.cells[0].textContent;
      const branchName = selectedRow.cells[1].textContent;
      document.getElementById('branchIdField').value = branchId;
      document.getElementById('headOfficeField').value = branchName;
      modal.remove();
    } else {
      alert('Please select a branch');
    }
  };
  
  navRow.appendChild(okBtn);
  body.appendChild(navRow);
  
  content.appendChild(body);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Load branches and setup interactions
  await fetchAndDisplayBranches();
  
  // Search button handler
  searchBtn.onclick = handleBranchSearch;
  
  // Enter key handlers
  idInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBranchSearch();
    }
  });
  
  nameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBranchSearch();
    }
  });
  
  // Close on outside click
  modal.onclick = function(e) {
    if (e.target === modal) modal.remove();
  };
}

async function fetchAndDisplayBranches() {
  console.log('[Branch Search] fetchAndDisplayBranches called');
  const tableBody = document.querySelector('#branchSearchTable tbody');
  if (!tableBody) {
    console.error('[Branch Search] Table body not found!');
    return;
  }
  
  tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#94a3b8;">Loading...</td></tr>';

  // Ensure service is loaded
  if (!GeneralLedgerService) {
    console.log('[Branch Search] GeneralLedgerService not loaded, initializing...');
    await initServices();
  }
  
  if (!GeneralLedgerService) {
    console.error('[Branch Search] GeneralLedgerService still not available after init');
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#ef4444;">Service not available</td></tr>';
    return;
  }
  
  console.log('[Branch Search] Service loaded, checking for getSearchResult method...');
  if (typeof GeneralLedgerService.getSearchResult !== 'function') {
    console.error('[Branch Search] getSearchResult method not found on GeneralLedgerService');
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#ef4444;">getSearchResult method not available</td></tr>';
    return;
  }
  
  try {
    console.log('[Branch Search] Calling getSearchResult with params:', {
      TableID: 'OurBranchID',
      OperatorID: sessionData.OperatorID,
      OurBranchID: sessionData.OurBranchID
    });
    
    const result = await GeneralLedgerService.getSearchResult({
      TableID: 'OurBranchID',
      AdvFilterString: '',
      WhereStmt: '',
      PrevOrNext: 0,
      RefID: '',
      OperatorID: sessionData.OperatorID,
      ModuleID: 8100,
      OurBranchID: sessionData.OurBranchID,
      SearchKey: '',
      LanguageID: 'en'
    });
    
    console.log('[Branch Search] API Response:', result);
    
    // Try different response structures
    let branchesData = null;
    if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
      branchesData = result.data.Details;
    } else if (result.Details && Array.isArray(result.Details)) {
      branchesData = result.Details;
    } else if (Array.isArray(result.data)) {
      branchesData = result.data;
    }
    
    if (branchesData && branchesData.length > 0) {
      console.log('[Branch Search] Found', branchesData.length, 'branches from API');
      allBranches = branchesData;
      renderBranchTable(allBranches);
    } else {
      console.warn('[Branch Search] No branches from API, using hardcoded data');
      // allBranches already contains hardcoded data from initialization
      renderBranchTable(allBranches);
    }
  } catch (err) {
    console.error('[Branch Search] Error fetching branches:', err);
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#ef4444;">' + (err.message || err) + '</td></tr>';
  }
}

function renderBranchTable(data) {
  console.log('[Branch Search] renderBranchTable called with', data ? data.length : 0, 'branches');
  const tableBody = document.querySelector('#branchSearchTable tbody');
  if (!tableBody) {
    console.error('[Branch Search] Table body not found in renderBranchTable');
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('[Branch Search] No data to display');
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:#94a3b8;">No branches found.</td></tr>';
    return;
  }
  
  console.log('[Branch Search] Rendering', data.length, 'branches to table');
  tableBody.innerHTML = data.map((branch, idx) =>
    '<tr data-branch-id="' + branch.OurBranchID + '" data-branch-name="' + branch.BranchName + '" tabindex="0" role="row" aria-selected="false" style="cursor:pointer;outline:none;border-bottom:1px solid #e5e7eb;">' +
      '<td style="padding:8px 12px;">' + (branch.OurBranchID || '') + '</td>' +
      '<td style="padding:8px 12px;">' + (branch.BranchName || '') + '</td>' +
    '</tr>'
  ).join('');
  
  console.log('[Branch Search] Table HTML updated');

  // Row selection logic
  let selectedRow = null;
  const rows = tableBody.querySelectorAll('tr');
  rows.forEach(row => {
    row.addEventListener('click', function(e) {
      e.stopPropagation();
      rows.forEach(r => { 
        r.classList.remove('table-active'); 
        r.setAttribute('aria-selected', 'false');
        r.style.background = '';
      });
      selectedRow = this;
      selectedRow.classList.add('table-active');
      selectedRow.setAttribute('aria-selected', 'true');
      selectedRow.style.background = '#e0e7ff';
      selectedRow.focus();
    });
    
    // Double-click to select
    row.addEventListener('dblclick', function() {
      const branchId = this.getAttribute('data-branch-id');
      const branchName = this.getAttribute('data-branch-name');
      document.getElementById('branchIdField').value = branchId;
      document.getElementById('headOfficeField').value = branchName;
      const modal = document.getElementById('branchSearchModal');
      if (modal) modal.remove();
    });
  });
}

function handleBranchSearch() {
  const idType = document.getElementById('branchSearchIdType').value;
  const idVal = document.getElementById('branchSearchId').value.trim();
  const nameType = document.getElementById('branchSearchNameType').value;
  const nameVal = document.getElementById('branchSearchName').value.trim();
  
  let filtered = allBranches;
  
  if (idVal) {
    if (idType === 'equals') {
      filtered = filtered.filter(b => (b.OurBranchID || '').toLowerCase() === idVal.toLowerCase());
    } else {
      filtered = filtered.filter(b => (b.OurBranchID || '').toLowerCase().includes(idVal.toLowerCase()));
    }
  }
  
  if (nameVal) {
    if (nameType === 'equals') {
      filtered = filtered.filter(b => (b.BranchName || '').toLowerCase() === nameVal.toLowerCase());
    } else {
      filtered = filtered.filter(b => (b.BranchName || '').toLowerCase().includes(nameVal.toLowerCase()));
    }
  }
  
  renderBranchTable(filtered);
}

// Account Search Modal Functions
let allAccounts = [];

async function showAccountSearchModal() {
  console.log('[Account Search] showAccountSearchModal called');
  
  // Remove existing modal if present
  const existingModal = document.getElementById('accountSearchModal');
  if (existingModal) {
    console.log('[Account Search] Removing existing modal');
    existingModal.remove();
  }
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'accountSearchModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10000';
  
  // Create modal content
  const content = document.createElement('div');
  content.style.background = 'white';
  content.style.borderRadius = '8px';
  content.style.width = '700px';
  content.style.maxHeight = '80vh';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  
  // Modal header
  const header = document.createElement('div');
  header.style.background = '#517a8e';
  header.style.color = 'white';
  header.style.padding = '12px 16px';
  header.style.borderRadius = '8px 8px 0 0';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  const headerTitle = document.createElement('div');
  headerTitle.textContent = isAddMode ? 'GL Without Branch' : 'GL Branch';
  headerTitle.style.fontSize = '14px';
  headerTitle.style.fontWeight = '600';
  
  const headerButtons = document.createElement('div');
  headerButtons.style.display = 'flex';
  headerButtons.style.gap = '8px';
  
  const minimizeBtn = document.createElement('button');
  minimizeBtn.innerHTML = '−';
  minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
  minimizeBtn.style.border = 'none';
  minimizeBtn.style.color = 'white';
  minimizeBtn.style.width = '32px';
  minimizeBtn.style.height = '32px';
  minimizeBtn.style.borderRadius = '4px';
  minimizeBtn.style.cursor = 'pointer';
  minimizeBtn.style.fontSize = '20px';
  minimizeBtn.onclick = function() { content.style.display = 'none'; };
  
  const maximizeBtn = document.createElement('button');
  maximizeBtn.innerHTML = '□';
  maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
  maximizeBtn.style.border = 'none';
  maximizeBtn.style.color = 'white';
  maximizeBtn.style.width = '32px';
  maximizeBtn.style.height = '32px';
  maximizeBtn.style.borderRadius = '4px';
  maximizeBtn.style.cursor = 'pointer';
  maximizeBtn.style.fontSize = '16px';
  maximizeBtn.onclick = function() { 
    if (content.style.width === '95vw') {
      content.style.width = '700px';
      content.style.maxHeight = '80vh';
    } else {
      content.style.width = '95vw';
      content.style.maxHeight = '95vh';
    }
  };
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.background = 'rgba(255,255,255,0.1)';
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'white';
  closeBtn.style.width = '32px';
  closeBtn.style.height = '32px';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '24px';
  closeBtn.onclick = function() { modal.remove(); };
  
  headerButtons.appendChild(minimizeBtn);
  headerButtons.appendChild(maximizeBtn);
  headerButtons.appendChild(closeBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);
  content.appendChild(header);
  
  // Modal body
  const body = document.createElement('div');
  body.style.padding = '24px';
  body.style.overflowY = 'auto';
  body.style.flex = '1';
  
  // Filter rows
  // Filter section
  const filterContainer = document.createElement('div');
  filterContainer.style.display = 'flex';
  filterContainer.style.flexDirection = 'column';
  filterContainer.style.gap = '12px';
  filterContainer.style.marginBottom = '16px';
  
  // Row 1: Account ID and Description
  const row1 = document.createElement('div');
  row1.style.display = 'flex';
  row1.style.gap = '16px';
  row1.style.alignItems = 'flex-end';
  
  // Account ID column
  const accountIdColumn = document.createElement('div');
  accountIdColumn.style.display = 'flex';
  accountIdColumn.style.flexDirection = 'column';
  accountIdColumn.style.gap = '4px';
  accountIdColumn.style.flex = '1';
  
  const accountIdLabel = document.createElement('label');
  accountIdLabel.textContent = 'Account ID';
  accountIdLabel.style.fontSize = '12px';
  accountIdLabel.style.fontWeight = '500';
  
  const accountIdControls = document.createElement('div');
  accountIdControls.style.display = 'flex';
  accountIdControls.style.gap = '4px';
  
  const accountIdType = document.createElement('select');
  accountIdType.id = 'accountSearchIdType';
  accountIdType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
  accountIdType.style.height = '32px';
  accountIdType.style.fontSize = '12px';
  accountIdType.style.borderRadius = '4px';
  accountIdType.style.border = '1px solid #d1d5db';
  accountIdType.style.width = '80px';
  
  const accountIdInput = document.createElement('input');
  accountIdInput.id = 'accountSearchId';
  accountIdInput.type = 'text';
  accountIdInput.style.flex = '1';
  accountIdInput.style.height = '32px';
  accountIdInput.style.fontSize = '12px';
  accountIdInput.style.padding = '6px 10px';
  accountIdInput.style.borderRadius = '4px';
  accountIdInput.style.border = '1px solid #d1d5db';
  
  accountIdControls.appendChild(accountIdType);
  accountIdControls.appendChild(accountIdInput);
  accountIdColumn.appendChild(accountIdLabel);
  accountIdColumn.appendChild(accountIdControls);
  
  // Description column
  const descColumn = document.createElement('div');
  descColumn.style.display = 'flex';
  descColumn.style.flexDirection = 'column';
  descColumn.style.gap = '4px';
  descColumn.style.flex = '1';
  
  const descLabel = document.createElement('label');
  descLabel.textContent = 'Description';
  descLabel.style.fontSize = '12px';
  descLabel.style.fontWeight = '500';
  
  const descControls = document.createElement('div');
  descControls.style.display = 'flex';
  descControls.style.gap = '4px';
  
  const descType = document.createElement('select');
  descType.id = 'accountSearchDescType';
  descType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
  descType.style.height = '32px';
  descType.style.fontSize = '12px';
  descType.style.borderRadius = '4px';
  descType.style.border = '1px solid #d1d5db';
  descType.style.width = '80px';
  
  const descInput = document.createElement('input');
  descInput.id = 'accountSearchDesc';
  descInput.type = 'text';
  descInput.style.flex = '1';
  descInput.style.height = '32px';
  descInput.style.fontSize = '12px';
  descInput.style.padding = '6px 10px';
  descInput.style.borderRadius = '4px';
  descInput.style.border = '1px solid #d1d5db';
  
  descControls.appendChild(descType);
  descControls.appendChild(descInput);
  descColumn.appendChild(descLabel);
  descColumn.appendChild(descControls);
  
  row1.appendChild(accountIdColumn);
  row1.appendChild(descColumn);
  
  // Row 2: GL Account Type ID and Currency ID (only in normal mode)
  let row2;
  if (!isAddMode) {
    row2 = document.createElement('div');
    row2.style.display = 'flex';
    row2.style.gap = '16px';
    row2.style.alignItems = 'flex-end';
    
    // GL Account Type ID column
    const glAccountTypeColumn = document.createElement('div');
    glAccountTypeColumn.style.display = 'flex';
    glAccountTypeColumn.style.flexDirection = 'column';
    glAccountTypeColumn.style.gap = '4px';
    glAccountTypeColumn.style.flex = '1';
    
    const glAccountTypeLabel = document.createElement('label');
    glAccountTypeLabel.textContent = 'GLAccountTypeID';
    glAccountTypeLabel.style.fontSize = '12px';
    glAccountTypeLabel.style.fontWeight = '500';
    
    const glAccountTypeControls = document.createElement('div');
    glAccountTypeControls.style.display = 'flex';
    glAccountTypeControls.style.gap = '4px';
    
    const glAccountTypeType = document.createElement('select');
    glAccountTypeType.id = 'accountSearchGLTypeType';
    glAccountTypeType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    glAccountTypeType.style.height = '32px';
    glAccountTypeType.style.fontSize = '12px';
    glAccountTypeType.style.borderRadius = '4px';
    glAccountTypeType.style.border = '1px solid #d1d5db';
    glAccountTypeType.style.width = '80px';
    
    const glAccountTypeInput = document.createElement('input');
    glAccountTypeInput.id = 'accountSearchGLType';
    glAccountTypeInput.type = 'text';
    glAccountTypeInput.style.flex = '1';
    glAccountTypeInput.style.height = '32px';
    glAccountTypeInput.style.fontSize = '12px';
    glAccountTypeInput.style.padding = '6px 10px';
    glAccountTypeInput.style.borderRadius = '4px';
    glAccountTypeInput.style.border = '1px solid #d1d5db';
    
    glAccountTypeControls.appendChild(glAccountTypeType);
    glAccountTypeControls.appendChild(glAccountTypeInput);
    glAccountTypeColumn.appendChild(glAccountTypeLabel);
    glAccountTypeColumn.appendChild(glAccountTypeControls);
    
    // Currency ID column
    const currencyColumn = document.createElement('div');
    currencyColumn.style.display = 'flex';
    currencyColumn.style.flexDirection = 'column';
    currencyColumn.style.gap = '4px';
    currencyColumn.style.flex = '1';
    
    const currencyLabel = document.createElement('label');
    currencyLabel.textContent = 'CurrencyID';
    currencyLabel.style.fontSize = '12px';
    currencyLabel.style.fontWeight = '500';
    
    const currencyControls = document.createElement('div');
    currencyControls.style.display = 'flex';
    currencyControls.style.gap = '4px';
    
    const currencyType = document.createElement('select');
    currencyType.id = 'accountSearchCurrencyType';
    currencyType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    currencyType.style.height = '32px';
    currencyType.style.fontSize = '12px';
    currencyType.style.borderRadius = '4px';
    currencyType.style.border = '1px solid #d1d5db';
    currencyType.style.width = '80px';
    
    const currencyInput = document.createElement('input');
    currencyInput.id = 'accountSearchCurrency';
    currencyInput.type = 'text';
    currencyInput.style.flex = '1';
    currencyInput.style.height = '32px';
    currencyInput.style.fontSize = '12px';
    currencyInput.style.padding = '6px 10px';
    currencyInput.style.borderRadius = '4px';
    currencyInput.style.border = '1px solid #d1d5db';
    
    currencyControls.appendChild(currencyType);
    currencyControls.appendChild(currencyInput);
    currencyColumn.appendChild(currencyLabel);
    currencyColumn.appendChild(currencyControls);
    
    row2.appendChild(glAccountTypeColumn);
    row2.appendChild(currencyColumn);
  }
  
  
  filterContainer.appendChild(row1);
  if (!isAddMode && row2) {
    filterContainer.appendChild(row2);
  }
  
  // Search button
  const searchBtn = document.createElement('button');
  searchBtn.textContent = 'Search';
  searchBtn.style.height = '32px';
  searchBtn.style.padding = '0 16px';
  searchBtn.style.fontSize = '12px';
  searchBtn.style.fontWeight = '500';
  searchBtn.style.background = '#517a8e';
  searchBtn.style.color = 'white';
  searchBtn.style.border = 'none';
  searchBtn.style.borderRadius = '4px';
  searchBtn.style.cursor = 'pointer';
  searchBtn.style.marginTop = '12px';
  searchBtn.onclick = handleAccountSearch;
  
  const searchRow = document.createElement('div');
  searchRow.style.display = 'flex';
  searchRow.style.justifyContent = 'center';
  searchRow.appendChild(searchBtn);
  filterContainer.appendChild(searchRow);
  
  body.appendChild(filterContainer);
  
  // Results header
  const resultsHeader = document.createElement('div');
  resultsHeader.textContent = 'Search Results';
  resultsHeader.style.fontSize = '13px';
  resultsHeader.style.fontWeight = '600';
  resultsHeader.style.margin = '16px 0 8px 0';
  resultsHeader.style.paddingBottom = '8px';
  resultsHeader.style.borderBottom = '2px solid #f9b233';
  body.appendChild(resultsHeader);
  
  // Results table
  const table = document.createElement('table');
  table.id = 'accountSearchTable';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '12px';
  
  // Table structure depends on mode
  if (isAddMode) {
    table.innerHTML = `
      <thead>
        <tr style="background:#517a8e;color:#fff;">
          <th style="padding: 8px 12px; text-align: left; width: 30px;">#</th>
          <th style="padding: 8px 12px; text-align: left;">AccountID</th>
          <th style="padding: 8px 12px; text-align: left;">Description</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
  } else {
    table.innerHTML = `
      <thead>
        <tr style="background:#517a8e;color:#fff;">
          <th style="padding: 8px 12px; text-align: left; width: 30px;">#</th>
          <th style="padding: 8px 12px; text-align: left;">GLAccountID</th>
          <th style="padding: 8px 12px; text-align: left;">Description</th>
          <th style="padding: 8px 12px; text-align: left;">GLAccountTypeID</th>
          <th style="padding: 8px 12px; text-align: left;">CurrencyID</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
  }
  body.appendChild(table);
  
  // Navigation row
  const navRow = document.createElement('div');
  navRow.style.display = 'flex';
  navRow.style.justifyContent = 'space-between';
  navRow.style.alignItems = 'center';
  navRow.style.marginTop = '16px';
  
  const leftArrow = document.createElement('button');
  leftArrow.innerHTML = '◄';
  leftArrow.style.background = '#517a8e';
  leftArrow.style.color = 'white';
  leftArrow.style.border = 'none';
  leftArrow.style.borderRadius = '4px';
  leftArrow.style.width = '40px';
  leftArrow.style.height = '32px';
  leftArrow.style.cursor = 'pointer';
  leftArrow.style.fontSize = '14px';
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.height = '32px';
  okBtn.style.padding = '0 24px';
  okBtn.style.fontSize = '12px';
  okBtn.style.fontWeight = '500';
  okBtn.style.background = '#517a8e';
  okBtn.style.color = 'white';
  okBtn.style.border = 'none';
  okBtn.style.borderRadius = '4px';
  okBtn.style.cursor = 'pointer';
  okBtn.onclick = function() {
    const selected = document.querySelector('#accountSearchTable tbody tr.selected');
    if (selected) {
      const accountId = selected.cells[1].textContent;
      const description = selected.cells[2].textContent;
      const branchId = document.getElementById('branchIdField').value.trim();
      document.getElementById('accountIdField').value = accountId;
      document.getElementById('accountNameField').value = description;
      console.log('[Account Search] Selected account:', accountId, '-', description);
      modal.remove();
      
      // Auto-load GL branch data
      if (accountId && branchId) {
        console.log('[Account Search] Auto-loading data for account:', accountId);
        loadGLBranchData(branchId, accountId);
      }
    } else {
      alert('Please select an account');
    }
  };
  
  const rightArrow = document.createElement('button');
  rightArrow.innerHTML = '►';
  rightArrow.style.background = '#517a8e';
  rightArrow.style.color = 'white';
  rightArrow.style.border = 'none';
  rightArrow.style.borderRadius = '4px';
  rightArrow.style.width = '40px';
  rightArrow.style.height = '32px';
  rightArrow.style.cursor = 'pointer';
  rightArrow.style.fontSize = '14px';
  
  navRow.appendChild(leftArrow);
  navRow.appendChild(okBtn);
  navRow.appendChild(rightArrow);
  body.appendChild(navRow);
  
  content.appendChild(body);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Fetch and display accounts
  await fetchAndDisplayAccounts();
  
  // Enter key handlers
  accountIdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAccountSearch();
    }
  });
  
  descInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAccountSearch();
    }
  });
  
  // Only add these handlers in add mode (they don't exist in normal mode)
  if (isAddMode) {
    glAccountTypeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAccountSearch();
      }
    });
    
    currencyInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAccountSearch();
      }
    });
  }
  
  // Close on outside click
  modal.onclick = function(e) {
    if (e.target === modal) modal.remove();
  };
}

async function fetchAndDisplayAccounts() {
  console.log('[Account Search] fetchAndDisplayAccounts called');
  const tableBody = document.querySelector('#accountSearchTable tbody');
  if (!tableBody) {
    console.error('[Account Search] Table body not found!');
    return;
  }
  
  const colSpan = isAddMode ? 3 : 5;
  tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#94a3b8;">Loading...</td></tr>`;

  // Ensure service is loaded
  if (!GeneralLedgerService) {
    console.log('[Account Search] GeneralLedgerService not loaded, initializing...');
    await initServices();
  }
  
  if (!GeneralLedgerService) {
    console.error('[Account Search] GeneralLedgerService still not available after init');
    tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#ef4444;">Service not available</td></tr>`;
    return;
  }
  
  console.log('[Account Search] Service loaded, checking for getSearchResult method...');
  if (typeof GeneralLedgerService.getSearchResult !== 'function') {
    console.error('[Account Search] getSearchResult method not found on GeneralLedgerService');
    tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#ef4444;">getSearchResult method not available</td></tr>`;
    return;
  }
  
  try {
    const tableID = isAddMode ? 'GLWithoutBranchID' : 'GLBranchID';
    const currentBranchId = document.getElementById('branchIdField').value.trim() || sessionData.OurBranchID;
    
    console.log('[Account Search] ============ SEARCH REQUEST ============');
    console.log('[Account Search] Mode:', isAddMode ? 'Add (GL Without Branch)' : 'View (GL Branch)');
    console.log('[Account Search] BranchID:', currentBranchId);
    console.log('[Account Search] BankID:', sessionData.BankID);
    
    let result;
    let accountsData = null;
    
    if (isAddMode) {
      // Add mode - use GLWithoutBranchID table
      const advFilter = `BankID='${sessionData.BankID}' AND OurBranchID='${currentBranchId}'`;
      console.log('[Account Search] TableID:', tableID);
      console.log('[Account Search] AdvFilterString:', advFilter);
      console.log('[Account Search] ==========================================');
      
      result = await GeneralLedgerService.getSearchResult({
        TableID: tableID,
        AdvFilterString: advFilter,
        WhereStmt: '',
        PrevOrNext: 0,
        RefID: '',
        OperatorID: sessionData.OperatorID,
        ModuleID: 8020,
        OurBranchID: sessionData.OurBranchID,
        SearchKey: '',
        LanguageID: 'en'
      });
      
      console.log('[Account Search] ============ API RESPONSE ============');
      console.log('[Account Search] Full Response:', JSON.stringify(result, null, 2));
      console.log('[Account Search] ===================================');
      
      // Try different response structures
      if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
        accountsData = result.data.Details;
      } else if (result.Details && Array.isArray(result.Details)) {
        accountsData = result.Details;
      } else if (Array.isArray(result.data)) {
        accountsData = result.data;
      }
    } else {
      // Normal mode - get both GLBranchID view AND actual t_GLBranch records
      const advFilter = `OurBranchID='${currentBranchId}'`;
      console.log('[Account Search] Fetching from two sources:');
      console.log('[Account Search] 1. GLBranchID view (filtered accounts)');
      console.log('[Account Search] 2. GLBranch table (all assigned accounts)');
      console.log('[Account Search] AdvFilterString:', advFilter);
      console.log('[Account Search] ==========================================');
      
      // Get both sources
      const [viewResult, tableResult] = await Promise.all([
        GeneralLedgerService.getSearchResult({
          TableID: 'GLBranchID',
          AdvFilterString: advFilter,
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: '',
          OperatorID: sessionData.OperatorID,
          ModuleID: 8020,
          OurBranchID: sessionData.OurBranchID,
          SearchKey: '',
          LanguageID: 'en'
        }),
        GeneralLedgerService.getSearchResult({
          TableID: 'GLBranch',
          AdvFilterString: advFilter,
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: '',
          OperatorID: sessionData.OperatorID,
          ModuleID: 8020,
          OurBranchID: sessionData.OurBranchID,
          SearchKey: '',
          LanguageID: 'en'
        })
      ]);
      
      result = viewResult; // Use viewResult as base
      
      console.log('[Account Search] ============ API RESPONSES ============');
      console.log('[Account Search] GLBranchID view:', viewResult.data?.Details?.length || 0, 'accounts');
      console.log('[Account Search] GLBranch table:', tableResult.data?.Details?.length || 0, 'accounts');
      
      // Get view accounts
      let viewAccounts = [];
      if (viewResult.data?.Details && Array.isArray(viewResult.data.Details)) {
        viewAccounts = viewResult.data.Details;
      } else if (viewResult.Details && Array.isArray(viewResult.Details)) {
        viewAccounts = viewResult.Details;
      }
      
      // Get table accounts  
      let tableAccounts = [];
      if (tableResult.data?.Details && Array.isArray(tableResult.data.Details)) {
        tableAccounts = tableResult.data.Details;
      } else if (tableResult.Details && Array.isArray(tableResult.Details)) {
        tableAccounts = tableResult.Details;
      }
      
      // Merge accounts - add table accounts that aren't in view
      const viewAccountIds = new Set(viewAccounts.map(a => a.AccountID));
      
      // Get manually added accounts for this branch that aren't in the view
      const manuallyAddedForBranch = addedAccounts
        .filter(a => a.OurBranchID === currentBranchId && !viewAccountIds.has(a.AccountID))
        .map(a => a.AccountID);
      
      console.log('[Account Search] Manually added accounts for this branch:', manuallyAddedForBranch);
      
      // Fetch details for additional accounts using p_getGLBranches
      const additionalAccounts = [];
      for (const accountId of manuallyAddedForBranch) {
        try {
          const accountDetails = await GeneralLedgerService.getGLBranches({
            OurBranchID: currentBranchId,
            AccountID: accountId,
            OperatorID: sessionData.OperatorID,
            Direction: 0
          });
          
          // Extract account info from Details01
          if (accountDetails.data?.Details01?.[0]) {
            const detail = accountDetails.data.Details01[0];
            additionalAccounts.push({
              AccountID: detail.AccountID,
              Description: detail.Description || '',
              GLAccountTypeID: detail.GLAccountType || '',
              CurrencyID: detail.CurrencyID || ''
            });
            console.log('[Account Search] Fetched details for', accountId, '-', detail.Description);
          }
        } catch (err) {
          console.warn('[Account Search] Failed to fetch details for', accountId, err);
          // Add with minimal info
          additionalAccounts.push({
            AccountID: accountId,
            Description: 'Account ' + accountId,
            GLAccountTypeID: '',
            CurrencyID: ''
          });
        }
      }
      
      accountsData = [...viewAccounts, ...additionalAccounts];
      
      console.log('[Account Search] Merged total:', accountsData.length, 'accounts');
      console.log('[Account Search] - From GLBranchID view:', viewAccounts.length);
      console.log('[Account Search] - Additional from GLBranch:', additionalAccounts.length);
      console.log('[Account Search] ===================================');
    }
    
    if (accountsData && accountsData.length > 0) {
      console.log('[Account Search] Found', accountsData.length, 'accounts total');
      allAccounts = accountsData;
      renderAccountTable(allAccounts);
    } else {
      console.warn('[Account Search] No accounts from API');
      const colSpan = isAddMode ? 3 : 5;
      tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#94a3b8;">No accounts found.</td></tr>`;
    }
  } catch (err) {
    console.error('[Account Search] Error fetching accounts:', err);
    const colSpan = isAddMode ? 3 : 5;
    tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#ef4444;">${err.message || err}</td></tr>`;
  }
}

function renderAccountTable(data) {
  console.log('[Account Search] renderAccountTable called with', data ? data.length : 0, 'accounts');
  const tableBody = document.querySelector('#accountSearchTable tbody');
  if (!tableBody) {
    console.error('[Account Search] Table body not found in renderAccountTable');
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('[Account Search] No data to display');
    const colSpan = isAddMode ? 3 : 5;
    tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#94a3b8;">No accounts found.</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = '';
  data.forEach((account, index) => {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.style.transition = 'background-color 0.2s ease';
    
    const cellNum = document.createElement('td');
    cellNum.textContent = index + 1;
    cellNum.style.padding = '8px 12px';
    cellNum.style.borderBottom = '1px solid #e5e7eb';
    
    const cellId = document.createElement('td');
    cellId.textContent = account.AccountID || account.GLAccountID || '';
    cellId.style.padding = '8px 12px';
    cellId.style.borderBottom = '1px solid #e5e7eb';
    
    row.appendChild(cellNum);
    row.appendChild(cellId);
    
    if (isAddMode) {
      // Add mode: Show Description only
      const cellDesc = document.createElement('td');
      cellDesc.textContent = account.Description || account.AccountDescription || '';
      cellDesc.style.padding = '8px 12px';
      cellDesc.style.borderBottom = '1px solid #e5e7eb';
      row.appendChild(cellDesc);
    } else {
      // Normal mode: Show Description, GLAccountTypeID and CurrencyID
      const cellDesc = document.createElement('td');
      cellDesc.textContent = account.Description || account.AccountDescription || '';
      cellDesc.style.padding = '8px 12px';
      cellDesc.style.borderBottom = '1px solid #e5e7eb';
      
      const cellType = document.createElement('td');
      cellType.textContent = account.GLAccountTypeID || account.AccountType || 'A';
      cellType.style.padding = '8px 12px';
      cellType.style.borderBottom = '1px solid #e5e7eb';
      
      const cellCurrency = document.createElement('td');
      cellCurrency.textContent = account.CurrencyID || 'ETB';
      cellCurrency.style.padding = '8px 12px';
      cellCurrency.style.borderBottom = '1px solid #e5e7eb';
      
      row.appendChild(cellDesc);
      row.appendChild(cellType);
      row.appendChild(cellCurrency);
    }
    
    // Click handler
    row.onclick = function() {
      const allRows = tableBody.querySelectorAll('tr');
      allRows.forEach(r => {
        r.classList.remove('selected');
        r.style.background = 'white';
      });
      this.classList.add('selected');
      this.style.background = '#e0f2fe';
    };
    
    // Double-click handler
    row.ondblclick = function() {
      const accountId = account.AccountID || account.GLAccountID || '';
      const description = account.Description || account.AccountDescription || '';
      const accountType = account.GLAccountTypeID || account.AccountType || '';
      const category = account.GLCategoryID || account.Category || '';
      const branchId = document.getElementById('branchIdField').value.trim();
      const accountField = document.getElementById('accountIdField');
      accountField.value = accountId;
      // Store account type and category as data attributes
      accountField.dataset.accountType = accountType;
      accountField.dataset.category = category;
      document.getElementById('accountNameField').value = description;
      console.log('[Account Search] Double-clicked account:', accountId, '-', description, 'Type:', accountType, 'Category:', category);
      document.getElementById('accountSearchModal').remove();
      
      // Auto-load GL branch data
      if (accountId && branchId) {
        console.log('[Account Search] Auto-loading data for account:', accountId);
        loadGLBranchData(branchId, accountId);
      }
    };
    
    // Hover effects
    row.onmouseenter = function() {
      if (!this.classList.contains('selected')) {
        this.style.background = '#f8fafc';
      }
    };
    
    row.onmouseleave = function() {
      if (!this.classList.contains('selected')) {
        this.style.background = 'white';
      }
    };
    
    tableBody.appendChild(row);
  });
  
  console.log('[Account Search] Rendered', data.length, 'rows');
}

function handleAccountSearch() {
  console.log('[Account Search] handleAccountSearch called');
  
  const idType = document.getElementById('accountSearchIdType').value;
  const idVal = document.getElementById('accountSearchId').value.trim();
  const descType = document.getElementById('accountSearchDescType').value;
  const descVal = document.getElementById('accountSearchDesc').value.trim();
  
  let filtered = allAccounts;
  
  if (idVal) {
    if (idType === 'equals') {
      filtered = filtered.filter(a => {
        const accountId = (a.AccountID || a.GLAccountID || '').toLowerCase();
        return accountId === idVal.toLowerCase();
      });
    } else {
      filtered = filtered.filter(a => {
        const accountId = (a.AccountID || a.GLAccountID || '').toLowerCase();
        return accountId.includes(idVal.toLowerCase());
      });
    }
  }
  
  if (descVal) {
    if (descType === 'equals') {
      filtered = filtered.filter(a => {
        const desc = (a.Description || a.AccountDescription || '').toLowerCase();
        return desc === descVal.toLowerCase();
      });
    } else {
      filtered = filtered.filter(a => {
        const desc = (a.Description || a.AccountDescription || '').toLowerCase();
        return desc.includes(descVal.toLowerCase());
      });
    }
  }
  
  // Additional filters only in normal mode (not Add mode)
  if (!isAddMode) {
    const glTypeElement = document.getElementById('accountSearchGLTypeType');
    const glTypeInputElement = document.getElementById('accountSearchGLType');
    const currencyTypeElement = document.getElementById('accountSearchCurrencyType');
    const currencyInputElement = document.getElementById('accountSearchCurrency');
    
    if (glTypeElement && glTypeInputElement) {
      const glTypeType = glTypeElement.value;
      const glTypeVal = glTypeInputElement.value.trim();
      
      if (glTypeVal) {
        if (glTypeType === 'equals') {
          filtered = filtered.filter(a => {
            const glType = (a.GLAccountTypeID || a.AccountType || '').toLowerCase();
            return glType === glTypeVal.toLowerCase();
          });
        } else {
          filtered = filtered.filter(a => {
            const glType = (a.GLAccountTypeID || a.AccountType || '').toLowerCase();
            return glType.includes(glTypeVal.toLowerCase());
          });
        }
      }
    }
    
    if (currencyTypeElement && currencyInputElement) {
      const currencyType = currencyTypeElement.value;
      const currencyVal = currencyInputElement.value.trim();
      
      if (currencyVal) {
        if (currencyType === 'equals') {
          filtered = filtered.filter(a => {
            const currency = (a.CurrencyID || '').toLowerCase();
            return currency === currencyVal.toLowerCase();
          });
        } else {
          filtered = filtered.filter(a => {
            const currency = (a.CurrencyID || '').toLowerCase();
            return currency.includes(currencyVal.toLowerCase());
          });
        }
      }
    }
  }
  
  renderAccountTable(filtered);
}

// Utility Functions
function setFieldValue(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = value;
  }
}

function getFieldValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.value : '';
}
