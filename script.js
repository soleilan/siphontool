class Resonator {
    constructor(type, intensity, parentTile) {
        this.type = type;
        this.intensity = intensity;
        this.parentTile = parentTile;
        this.listElement = null;
    }

    get output(){
        let lateralTorque = this.type === 'AX' ? this.parentTile.lateralValue * this.intensity : 0;
        let verticalTorque = this.type === 'AX' ? this.parentTile.verticalValue * this.intensity : 0;
        let shearDampening = this.type ==='SM' ? (Math.max(Math.abs(this.parentTile.lateralValue), Math.abs(this.parentTile.verticalValue))) * this.intensity : 0;

        return [lateralTorque, verticalTorque, shearDampening];
    }

    delete(){
        this.type = null;
        this.intensity = null;
        this.removeFromTile();
    }

    setType(newType) {
        if (newType !== this.type)
          this.type = newType;
    }

    setIntensity(newIntensity) {
        if (this.type === 'AX') {
            this.intensity = Math.max(0, Math.min(4, newIntensity));
        } else {
            this.intensity = Math.max(0, Math.min(3, newIntensity));
        }
        this.updateSprite();
    }

    createListElement() {
        // clone the template and skip document fragment nonsense, then add it to the list
        let clone = document.getElementById('resonator-template').content.firstElementChild.cloneNode(true);
        clone.parentResonator = this;
        clone.querySelector('.type').textContent = this.type;
        clone.querySelector('.designation').textContent = this.parentTile.coordinates;

        clone.querySelector('.slider input').oninput = function() {clone.parentResonator.setIntensity(this.value);clone.parentResonator.updateListElement();};

        if(this.type === "SM"){
            clone.querySelector('.slider input').max = 3;
            clone.querySelector('.tickfour').remove();
            clone.querySelectorAll('.ticks svg').forEach(el=>el.classList.add('sm'));
        }


        const sortedResonators = Object.values(gridObject.resonators);
        let insertIndex = -1;
        
        for (let i = 0; i < sortedResonators.length; i++) {
          if (sortedResonators[i] === clone.parentResonator) {
            insertIndex = i;
            break;
          }
        }
        
        if (insertIndex !== -1) {
          gridObject.resonatorList.insertBefore(clone, gridObject.resonatorList.children[insertIndex]);
        } else {
            gridObject.resonatorList.appendChild(clone);
        }


        return clone;
    }

    addToTile(){
        if(this.listElement === null) {
            gridObject.resonators[this.parentTile.coordinatesAsNumber] = this;
            console.time("createListElement");
            this.listElement = this.createListElement();
            console.timeEnd("createListElement");
            this.updateSprite();
        }
    }

    removeFromTile(){
        if(this.listElement !== null) {
            delete gridObject.resonators[this.parentTile.coordinatesAsNumber];
            this.listElement.remove();
            this.listElement = null;
            this.updateSprite();
        }
    }

    updateSprite(){
        const tileImage = this.parentTile.tileElement.querySelector('img');
        const resonatorImage = this.type + this.intensity + ".png";

        tileImage.src = this.type === null ? '' : resonatorImage;
        gridObject.calculateGrid();
    }

    clickListElement(event){
        const clickedElement = event.target;
        const clickedParent = event.target.parentNode;
  
        if(clickedElement.classList.contains('remove') || clickedParent.classList.contains('remove')){
          this.delete();
        }
    }

    updateListElement(){
        

        this.listElement.querySelector('.latvalue').textContent = this.parentTile.lateralValue;
        this.listElement.querySelector('.latresult').textContent = this.output[0];

        this.listElement.querySelector('.vertvalue').textContent = this.parentTile.verticalValue;
        this.listElement.querySelector('.vertresult').textContent = this.output[1];
        
        if(this.type === 'SM'){
            this.listElement.querySelector('.lateffect').textContent = this.parentTile.lateralValue >= this.parentTile.verticalValue ? "Dampening:" : "";
            this.listElement.querySelector('.verteffect').textContent = this.parentTile.lateralValue < this.parentTile.verticalValue ? "Dampening:" : "";
            this.listElement.querySelector('.latresult').textContent = this.parentTile.lateralValue >= this.parentTile.verticalValue ? this.output[2] : "";
            this.listElement.querySelector('.vertresult').textContent = this.parentTile.lateralValue < this.parentTile.verticalValue ? this.output[2] : "";
        }

        const slider = this.listElement.querySelector('.slider input');
        for(let i = 0; i < slider.max; i++){
            const ticks = this.listElement.querySelectorAll('.ticks svg polygon');
            if(slider.value >= i)
                ticks[i + 1].classList.add('lightup');
            else
                ticks[i + 1].classList.remove('lightup');
        }
    }
}

class Tile {
    constructor(tileElement, lateralCoordinate, verticalCoordinate, lateralValue, verticalValue) {
        this.tileElement = tileElement;
        this.lateralCoordinate = lateralCoordinate;
        this.verticalCoordinate = verticalCoordinate;
        this.lateralValue = lateralValue;
        this.verticalValue = verticalValue;
        this.Resonator = new Resonator(null, null, this);
        gridObject.tiles.push(this);
    }

    get coordinates() {
        return this.lateralCoordinate + "-" + this.verticalCoordinate;
    }

    get coordinatesAsNumber() {
        const num = (this.lateralCoordinate.charCodeAt() - 65) + ((8 - this.verticalCoordinate) * 9);
        return num;
    }

    get lateralTorque() {
        return this.lateralValue * this.Resonator.intensity;
    }

    get verticalTorque() {
        return this.verticalValue * this.Resonator.intensity;
    }

    get shearDampening() {

    }

    setResonator(type, intensity = 1) {
        if(type === this.Resonator.type || type === null){
            this.Resonator.delete();
        } else {
            this.Resonator.setType(type);
            this.Resonator.setIntensity(intensity);
            this.Resonator.addToTile();
        }
    }

    clickTile(event){
        if (this.coordinates === 'E-5' || this.coordinates === 'E-4') return;
        
        const resonatorType = event.button === 0 ? 'AX' : 'SM';
        this.setResonator(resonatorType);
    }
}

const gridObject = {
    totalIntensity: 0,
    totalResonators: 0,
    totalLateralResonance: 0,
    totalLateralShear: 0,
    totalVerticalResonance: 0,
    totalVerticalShear: 0,
    totalShearDampening: 0,
    tiles: [],
    resonators: {},

    get totalShear() {
      return Math.max(0, (this.totalLateralShear + this.totalVerticalShear) - this.totalShearDampening);
    },

    get innerGrid() {
        return document.getElementById('innerGridWrapper');
    },

    get outerGrid() {
        return document.getElementById('outerGridWrapper');
    },

    get resonatorList() {
        return document.getElementById('resonator-list');
    },

    tile(lateralCoordinate, verticalCoordinate) {
      const lateralIndex = lateralCoordinate.charCodeAt(0) - 65;
      const verticalIndex = 8 - parseInt(verticalCoordinate, 10);
      const tileIndex = verticalIndex * 9 + lateralIndex;
      return this.tiles[tileIndex];
    },

    resetGrid() {
        this.totalIntensity = 0;
        this.totalResonators = 0;
        this.totalLateralResonance = 0;
        this.totalLateralShear = 0;
        this.totalVerticalResonance = 0;
        this.totalVerticalShear = 0;
        this.totalShearDampening = 0;
    },

    calculateGrid() {
        let totalAbsoluteLateralResonance = 0;
        let totalAbsoluteVerticalResonance = 0;
        this.resetGrid();
        this.totalResonators = Object.keys(this.resonators).length;
        for(const resonator of Object.values(this.resonators)){
            this.totalIntensity += resonator.intensity;
            const resonatorOutput = resonator.output;
            this.totalLateralResonance += resonatorOutput[0];
            this.totalVerticalResonance += resonatorOutput[1];
            this.totalShearDampening += resonatorOutput[2];
            totalAbsoluteLateralResonance += Math.abs(resonatorOutput[0]);
            totalAbsoluteVerticalResonance += Math.abs(resonatorOutput[1]);
        }
        this.totalLateralShear = Math.max(0, (totalAbsoluteLateralResonance - Math.abs(this.totalLateralResonance)));
        this.totalVerticalShear = Math.max(0, (totalAbsoluteVerticalResonance - Math.abs(this.totalVerticalResonance)));



       /*  this.resonatorTiles.forEach(resonator => {
            const tile = resonator.parentTile;
            this.totalResonators++;
            this.totalIntensity += tile.Resonator.intensity;

            if (tile.Resonator.type === 'AX') {
                lateralRes += Math.abs(tile.lateralTorque);
                verticalRes += Math.abs(tile.verticalTorque);
                this.totalLateralResonance += tile.lateralTorque;
                this.totalVerticalResonance += tile.verticalTorque;
            } else if (tile.Resonator.type === 'SM') {
                this.totalShearDampening += Math.max(Math.abs(tile.lateralValue), Math.abs(tile.verticalValue));
            }
        });

        this.totalLateralShear = Math.max(0, lateralRes - Math.abs(this.totalLateralResonance));
        this.totalVerticalShear = Math.max(0, verticalRes - Math.abs(this.totalVerticalResonance)); */

        this.updateStatusDisplay();
    },

    updateStatusDisplay(){
        document.getElementById('value-lateral')
            .textContent = this.totalLateralResonance;
        document.getElementById('status-lateral')
            .title = 'Lateral Shear: ' + this.totalLateralShear;
        document.getElementById('value-vertical')
            .textContent = this.totalVerticalResonance;
        document.getElementById('status-vertical')
            .title = 'Vertical Shear: ' + this.totalVerticalShear;
        document.getElementById('value-shear')
            .textContent = this.totalShear;
        document.getElementById('status-shear')
            .title = 'Lateral Shear: ' + this.totalLateralShear + '\n' + 'Vertical Shear: ' + this.totalVerticalShear + '\n' + 'Shear Dampening: ' + this.totalShearDampening;
        document.getElementById('value-eeu')
            .textContent = this.totalIntensity;
        document.getElementById('status-eeu')
            .title = 'Total Resonators: ' + this.totalResonators + '\n' + 'Total Intensity: ' + this.totalIntensity;
    },

    generateGrid(){
        let gridIndex = 0;
        const letterCoordinate = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]; 
        const gridValues = [
        [ 1, -1], [ 1, -2], [ 1, -4], [ 1, -8], [ 1, 0], [ 1, 8],  [1, 4], [ 1, 2], [ 1, 1],
        [ 2, -1], [ 2, -2], [ 2, -4], [ 2, -8], [ 2, 0], [ 2, 8], [ 2, 4], [ 2, 2], [ 2, 1],
        [ 4, -1], [ 4, -2], [ 4, -4], [ 4, -8], [ 4, 0], [ 4, 8], [ 4, 4], [ 4, 2], [ 4, 1],
        [ 8, -1], [ 8, -2], [ 8, -4], [ 8, -8], [ 8, 0], [ 8, 8], [ 8, 4], [ 8, 2], [ 8, 1],
        [ 0, -1], [ 0, -2], [ 0, -4], [ 0, -8], [ 0, 0], [ 0, 8], [ 0, 4], [ 0, 2], [ 0, 1],
        [-8, -1], [-8, -2], [-8, -4], [-8, -8], [-8, 0], [-8, 8], [-8, 4], [-8, 2], [-8, 1],
        [-4, -1], [-4, -2], [-4, -4], [-4, -8], [-4, 0], [-4, 8], [-4, 4], [-4, 2], [-4, 1],
        [-2, -1], [-2, -2], [-2, -4], [-2, -8], [-2, 0], [-2, 8], [-2, 4], [-2, 2], [-2, 1],
        [-1, -1], [-1, -2], [-1, -4], [-1, -8], [-1, 0], [-1, 8], [-1, 4], [-1, 2], [-1, 1]];

        // Loops in charge of generating the 81 tiles, assigning them IDs and lateral/vertical values
        for (let i = 8; i >= 0; i--) {
            for (let j = 0; j < 9; j++) {

                // Create tile element and attach tiledata, class and id
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.tileObject = new Tile(tile, letterCoordinate[j], i, gridValues[gridIndex][1], gridValues[gridIndex][0], new Resonator(null, null));
                tile.resonatorObject = tile.tileObject.Resonator;
                tile.id = `${tile.tileObject.lateralCoordinate}-${tile.tileObject.verticalCoordinate}`;

                // Create lateral and vertical elements with their respective grid values
                const lateral = document.createElement('div');
                lateral.className = 'lateral';
                lateral.textContent = tile.tileObject.lateralValue;
                const vertical = document.createElement('div');
                vertical.className = 'vertical';
                vertical.textContent = tile.tileObject.verticalValue;

                // Add image, lateral and vertical elements to the tile element
                tile.appendChild(document.createElement('img'));
                tile.appendChild(lateral);
                tile.appendChild(vertical);

                // Add tile element to the grid container and the allTiles array
                gridObject.innerGrid.appendChild(tile);

                // Assign special content and fill to siphonTiles and usableTiles arrays
                if (tile.id === 'E-5' || tile.id === 'E-4') {
                    tile.innerHTML = tile.id === 'E-4' ? '<img src="siphon.png" style="position: relative; top: -40px;">' : '';
                    tile.siphonTile = true;
                }

                // Increment index
                gridIndex++;
            }
        }
    }
};

function sortResonators() {
  const list = document.querySelector('.sidewindow .list');
  const resonators = Array.from(list.querySelectorAll('.resonator'));
  const sortedResonators = resonators.sort((a, b) => {
      const aVal = a.dataset.value.split('-');
      const bVal = b.dataset.value.split('-');
      if (aVal[1] !== bVal[1]) {
          return parseInt(bVal[1]) - parseInt(aVal[1]);
      } else {
          return aVal[0].charCodeAt(0) - bVal[0].charCodeAt(0);
      }
  });
  const status = document.querySelector('.sidewindow .list .status');
  list.innerHTML = '';
  list.appendChild(status);
  sortedResonators.forEach((resonator) => {
      list.appendChild(resonator);
  });
}

document.addEventListener("DOMContentLoaded", function () { 
    
    gridObject.generateGrid();

    gridObject.outerGrid.addEventListener('mousemove', event => {
        const hoveredTile = event.target.closest('.tile');
        if (!hoveredTile) return;

        const [thisColumn, thisRow] = hoveredTile.getAttribute('id').split('-');

        gridObject.tiles.forEach(tileClass => {
            const tile = tileClass.tileElement;
            const [otherColumn, otherRow] = tile.getAttribute('id').split('-');

            // Check for all tiles that are in the same row or column as us
            if (otherColumn === thisColumn || otherRow === thisRow) {
                // If they're above us in the column or to the left of us in the row, highlight!
                tile.classList.toggle("highlight", otherRow >= thisRow && otherColumn <= thisColumn);
            } else {
                tile.classList.remove("highlight");
            }
        });
    });

    gridObject.outerGrid.addEventListener('mouseleave', () => {
        gridObject.tiles.forEach(tileClass => {
            const tile = tileClass.tileElement;
            tile.classList.remove('highlight');
        });
    });

    gridObject.outerGrid.addEventListener('mousedown', function(event){
        event.target.closest('.tile').tileObject.clickTile(event);
    });

    gridObject.resonatorList.addEventListener('mousedown', function(event){
        event.target.closest('.resonator')?.parentResonator.clickListElement(event);
    });

    document.getElementById('topleft').addEventListener('click', event => {
            for (let tile in gridObject.resonators) {
                delete gridObject.resonators[tile];
            }
        });
    });
