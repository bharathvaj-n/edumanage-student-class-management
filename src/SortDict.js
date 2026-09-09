function SortDict(dict, key) {
    const n = dict.length;
    var least=0;
    var temparray=[];
    for(var i=0;i<n;i++){
        least=i;
      
        for(var j=i+1;j<n;j++){
            if( dict[j][key] < dict[least][key] ){
                least=j;
                
            }
           
        }
        temparray=dict[i];
        dict[i]=dict[least];
        dict[least]=temparray; 
    }
    return dict;
}
export default SortDict;